import { useRef, useState } from "react";
import AdminLayout from "./AdminLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { useConfirm } from "../../context/ConfirmContext";
import { uploadResourceFile, getSignedUrl, formatFileSize } from "../../lib/storage";
import { PageHeader, Card, Select, Input, Textarea, Button, Modal } from "../../components/UI";
import { EmptyState, ErrorState, CardSkeleton } from "../../components/AsyncStates";
import { Library, Plus, Download, Link as LinkIcon, FileText, Trash2, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";
import { friendlyError } from "../../lib/friendlyError";

export default function AdminResources() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const fileInputRef = useRef(null);
  const [programFilter, setProgramFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", program_id: "", link_url: "", category: "" });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: programs } = useSupabaseQuery(async () => {
    const { data } = await supabase.from("programs").select("id, name");
    return { data: data || [] };
  }, []);

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    let query = supabase
      .from("resources")
      .select("id, title, description, category, resource_type, file_url, link_url, created_at, program_id, program:programs(name)")
      .order("created_at", { ascending: false });
    if (programFilter) query = query.eq("program_id", programFilter);
    const { data, error } = await query;
    return { data, error };
  }, [programFilter]);

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", description: "", program_id: "", link_url: "", category: "" });
    setFile(null);
    setModalOpen(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({ title: r.title, description: r.description || "", program_id: r.program_id || "", link_url: r.link_url || "", category: r.category || "" });
    setFile(null);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Please provide a title.");
      return;
    }
    if (!editing && !file && !form.link_url.trim()) {
      toast.error("Please attach a file or provide a link.");
      return;
    }
    setSaving(true);
    try {
      let filePath = editing?.file_url || null;
      if (file) {
        const { data: uploadData, error: uploadErr } = await uploadResourceFile(form.program_id || "general", file);
        if (uploadErr) throw uploadErr;
        filePath = uploadData.path;
      }
      const payload = {
        title: form.title.trim(),
        description: form.description || null,
        program_id: form.program_id || null,
        category: form.category || null,
        link_url: form.link_url || null,
        file_url: filePath,
        resource_type: filePath ? "file" : "link",
        uploaded_by: user.id,
      };
      if (editing) {
        const { error } = await supabase.from("resources").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Resource updated");
      } else {
        const { error } = await supabase.from("resources").insert(payload);
        if (error) throw error;
        toast.success("Resource uploaded");
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't save resource."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r) => {
    const ok = await confirm({ title: "Delete resource?", description: `"${r.title}" will be permanently removed.`, confirmLabel: "Delete" });
    if (!ok) return;
    try {
      if (r.file_url) await supabase.storage.from("resources").remove([r.file_url]);
      const { error } = await supabase.from("resources").delete().eq("id", r.id);
      if (error) throw error;
      toast.success("Resource deleted");
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't delete resource."));
    }
  };

  const handleOpen = async (r) => {
    if (r.link_url) {
      window.open(r.link_url, "_blank", "noopener,noreferrer");
      return;
    }
    if (r.file_url) {
      const { data: url, error: err } = await getSignedUrl("resources", r.file_url);
      if (err) {
        toast.error("Couldn't open that file.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  if (error) {
    return (
      <AdminLayout>
        <ErrorState onRetry={refetch} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Resources"
        description="Upload and manage resources for programs and students."
        action={<Button onClick={openNew}><Plus size={15} /> Upload resource</Button>}
      />

      <div className="mb-5 max-w-xs">
        <Select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
          <option value="">All programs</option>
          {programs?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      {loading ? (
        <CardSkeleton count={3} />
      ) : !data || data.length === 0 ? (
        <Card><EmptyState title="No resources yet" description="Upload a file or add a link to get started." icon={Library} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-card bg-ink-100 text-ink-600 flex items-center justify-center shrink-0">
                  {r.link_url ? <LinkIcon size={16} /> : <FileText size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink-900 line-clamp-2">{r.title}</p>
                  <p className="text-xs text-ink-400 mt-0.5">{r.program?.name || "General"}{r.category ? ` · ${r.category}` : ""}</p>
                </div>
              </div>
              {r.description && <p className="text-sm text-ink-500 mt-3 line-clamp-2">{r.description}</p>}
              <div className="mt-4 pt-4 border-t border-ink-100 flex items-center justify-between">
                <button onClick={() => handleDelete(r)} className="text-ink-400 hover:text-alert-600">
                  <Trash2 size={15} />
                </button>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => handleOpen(r)}><Download size={13} /> Open</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit resource" : "Upload resource"} size="lg"
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></>}>
        <form className="space-y-4" onSubmit={handleSave}>
          <Input label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Textarea label="Description" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Program" value={form.program_id} onChange={(e) => setForm((f) => ({ ...f, program_id: e.target.value }))}>
              <option value="">General (all programs)</option>
              {programs?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <Input label="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Slides, Reading" />
          </div>
          <Input label="External link (optional)" value={form.link_url} onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))} placeholder="https://..." />
          <div
            className="border-2 border-dashed border-ink-200 rounded-card p-4 text-center cursor-pointer hover:border-ink-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud size={20} className="mx-auto text-ink-400 mb-1.5" />
            <p className="text-xs text-ink-600">{file ? `${file.name} (${formatFileSize(file.size)})` : editing?.file_url ? "Replace file (optional)" : "Attach a file (optional)"}</p>
            <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
