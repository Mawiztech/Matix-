import { useRef, useState } from "react";
import FacilitatorLayout from "./FacilitatorLayout";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { uploadResourceFile, getSignedUrl } from "../../lib/storage";
import { PageHeader, Card, Select, Input, Textarea, Button, Modal } from "../../components/UI";
import { EmptyState, ErrorState, CardSkeleton } from "../../components/AsyncStates";
import { Library, Plus, Download, Trash2, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";
import { friendlyError } from "../../lib/friendlyError";

export default function FacResources() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const fileInputRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", program_id: "", link_url: "" });
  const [saving, setSaving] = useState(false);

  const { data: programs } = useSupabaseQuery(async () => {
    if (!user) return { data: null };
    const { data } = await supabase.from("facilitator_programs").select("program:programs(id, name)").eq("facilitator_id", user.id);
    return { data: (data || []).map((r) => r.program).filter(Boolean) };
  }, [user?.id]);

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    if (!user) return { data: null };
    const { data, error } = await supabase
      .from("resources")
      .select("id, title, description, file_url, link_url, program:programs(name)")
      .eq("uploaded_by", user.id)
      .order("created_at", { ascending: false });
    return { data, error };
  }, [user?.id]);

  const openNew = () => {
    setForm({ title: "", description: "", program_id: "", link_url: "" });
    setFile(null);
    setModalOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Please provide a title.");
      return;
    }
    if (!file && !form.link_url.trim()) {
      toast.error("Please upload a file or provide a link.");
      return;
    }
    setSaving(true);
    try {
      let filePath = null;
      if (file) {
        const { data: uploadData, error: uploadErr } = await uploadResourceFile(form.program_id || "general", file);
        if (uploadErr) throw uploadErr;
        filePath = uploadData.path;
      }
      const { error } = await supabase.from("resources").insert({
        title: form.title.trim(), description: form.description || null, program_id: form.program_id || null,
        file_url: filePath, link_url: form.link_url.trim() || null, uploaded_by: user.id,
      });
      if (error) throw error;
      toast.success("Resource uploaded");
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't upload resource."));
    } finally {
      setSaving(false);
    }
  };

  const handleView = async (r) => {
    if (r.link_url) {
      window.open(r.link_url, "_blank", "noopener,noreferrer");
      return;
    }
    const { data: url, error: err } = await getSignedUrl("resources", r.file_url);
    if (err) {
      toast.error("Couldn't open that file.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
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

  if (error) {
    return (
      <FacilitatorLayout>
        <ErrorState onRetry={refetch} />
      </FacilitatorLayout>
    );
  }

  return (
    <FacilitatorLayout>
      <PageHeader title="Resources" description="Upload and manage learning materials." action={<Button onClick={openNew}><Plus size={15} /> Upload resource</Button>} />

      {loading ? (
        <CardSkeleton count={3} />
      ) : !data || data.length === 0 ? (
        <Card><EmptyState title="No resources uploaded yet" icon={Library} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((r) => (
            <Card key={r.id}>
              <p className="font-medium text-ink-900 line-clamp-2">{r.title}</p>
              <p className="text-xs text-ink-400 mt-0.5">{r.program?.name || "General"}</p>
              {r.description && <p className="text-sm text-ink-500 mt-2 line-clamp-2">{r.description}</p>}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-ink-100">
                <Button variant="outline" size="sm" onClick={() => handleView(r)}><Download size={13} /> Open</Button>
                <button onClick={() => handleDelete(r)} className="text-alert-600 hover:text-alert-700">
                  <Trash2 size={15} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Upload resource" size="lg"
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving}>{saving ? "Uploading..." : "Upload"}</Button></>}>
        <form className="space-y-4" onSubmit={handleCreate}>
          <Input label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Textarea label="Description" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <Select label="Program (optional)" value={form.program_id} onChange={(e) => setForm((f) => ({ ...f, program_id: e.target.value }))}>
            <option value="">General (all programs)</option>
            {programs?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <div
            className="border-2 border-dashed border-ink-200 rounded-card p-5 text-center cursor-pointer hover:border-ink-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadCloud size={20} className="mx-auto text-ink-400 mb-1.5" />
            <p className="text-sm text-ink-600">{file ? file.name : "Click to choose a file (optional)"}</p>
            <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <Input label="Or paste a link" value={form.link_url} onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))} placeholder="https://..." />
        </form>
      </Modal>
    </FacilitatorLayout>
  );
}
