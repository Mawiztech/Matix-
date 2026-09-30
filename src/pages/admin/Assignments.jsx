import { useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { useConfirm } from "../../context/ConfirmContext";
import { PageHeader, Card, StatusBadge, Select, Input, Textarea, Button, Modal } from "../../components/UI";
import { EmptyState, ErrorState, CardSkeleton } from "../../components/AsyncStates";
import { FileText, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { friendlyError } from "../../lib/friendlyError";

export default function AdminAssignments() {
  const confirm = useConfirm();
  const [programFilter, setProgramFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", program_id: "", deadline: "", max_score: 100 });
  const [saving, setSaving] = useState(false);

  const { data: programs } = useSupabaseQuery(async () => {
    const { data } = await supabase.from("programs").select("id, name");
    return { data: data || [] };
  }, []);

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    let query = supabase
      .from("assignments")
      .select("id, title, deadline, status, max_score, program:programs(name)")
      .order("created_at", { ascending: false });
    if (programFilter) query = query.eq("program_id", programFilter);
    const { data, error } = await query;
    if (error) return { error };

    const ids = data.map((a) => a.id);
    let counts = {};
    if (ids.length) {
      const { data: subs } = await supabase.from("assignment_submissions").select("assignment_id").in("assignment_id", ids);
      counts = (subs || []).reduce((acc, s) => { acc[s.assignment_id] = (acc[s.assignment_id] || 0) + 1; return acc; }, {});
    }
    return { data: data.map((a) => ({ ...a, submissionCount: counts[a.id] || 0 })) };
  }, [programFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.program_id) {
      toast.error("Please provide a title and program.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("assignments").insert({
        title: form.title.trim(), description: form.description || null, program_id: form.program_id,
        deadline: form.deadline || null, max_score: Number(form.max_score) || 100, status: "draft",
      });
      if (error) throw error;
      toast.success("Assignment created");
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't create assignment."));
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (a) => {
    const publishing = a.status !== "published";
    const { error } = await supabase.from("assignments").update({ status: publishing ? "published" : "draft" }).eq("id", a.id);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success(publishing ? "Published" : "Unpublished");
    refetch();
  };

  const handleDelete = async (a) => {
    const ok = await confirm({ title: "Delete assignment?", description: `"${a.title}" and all its submissions will be permanently removed.`, confirmLabel: "Delete" });
    if (!ok) return;
    const { error } = await supabase.from("assignments").delete().eq("id", a.id);
    if (error) {
      toast.error(friendlyError(error, "Couldn't delete this assignment. It may have existing submissions."));
      return;
    }
    toast.success("Assignment deleted");
    refetch();
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
      <PageHeader title="Assignments" description="Manage assignments across all programs." action={<Button onClick={() => setModalOpen(true)}><Plus size={15} /> New assignment</Button>} />

      <div className="mb-5 max-w-xs">
        <Select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
          <option value="">All programs</option>
          {programs?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      {loading ? (
        <CardSkeleton count={3} />
      ) : !data || data.length === 0 ? (
        <Card><EmptyState title="No assignments yet" icon={FileText} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-ink-900 line-clamp-2">{a.title}</p>
                <StatusBadge status={a.status} />
              </div>
              <p className="text-xs text-ink-400 mt-1">{a.program?.name} · {a.submissionCount} submission(s)</p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-ink-100">
                <span className="text-xs text-ink-400">{a.deadline ? format(new Date(a.deadline), "MMM d, yyyy") : "No due date"}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => togglePublish(a)} className="text-xs font-medium text-ink-600 hover:text-ink-900">{a.status === "published" ? "Unpublish" : "Publish"}</button>
                  <button onClick={() => handleDelete(a)} className="text-alert-600 hover:text-alert-700"><Trash2 size={14} /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New assignment" size="lg"
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create"}</Button></>}>
        <form className="space-y-4" onSubmit={handleCreate}>
          <Input label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Select label="Program" value={form.program_id} onChange={(e) => setForm((f) => ({ ...f, program_id: e.target.value }))}>
            <option value="">Select program</option>
            {programs?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Textarea label="Description" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Deadline" type="datetime-local" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
            <Input label="Max score" type="number" value={form.max_score} onChange={(e) => setForm((f) => ({ ...f, max_score: e.target.value }))} />
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
