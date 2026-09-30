import { useMemo, useState } from "react";
import AdminLayout from "./AdminLayout";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, StatusBadge, Select, Input, Textarea, Button, Modal } from "../../components/UI";
import { EmptyState, ErrorState, CardSkeleton } from "../../components/AsyncStates";
import { FolderKanban, Plus, Search } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { friendlyError } from "../../lib/friendlyError";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

export default function AdminProjects() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", program_id: "", assigned_to: "", status: "assigned", score: "", max_score: 100, feedback: "" });
  const [saving, setSaving] = useState(false);

  const { data: meta } = useSupabaseQuery(async () => {
    const [{ data: students }, { data: programs }] = await Promise.all([
      supabase.from("students").select("id, profile:profiles(full_name)"),
      supabase.from("programs").select("id, name"),
    ]);
    return { data: { students: students || [], programs: programs || [] } };
  }, []);

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    let query = supabase
      .from("projects")
      .select("id, title, description, status, score, max_score, feedback, created_at, program_id, assigned_to, program:programs(name), student:students(profile:profiles(full_name))")
      .order("created_at", { ascending: false });
    if (statusFilter) query = query.eq("status", statusFilter);
    if (programFilter) query = query.eq("program_id", programFilter);
    const { data, error } = await query;
    return { data, error };
  }, [statusFilter, programFilter]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!debouncedSearch) return data;
    const q = debouncedSearch.toLowerCase();
    return data.filter((p) => p.title?.toLowerCase().includes(q) || p.student?.profile?.full_name?.toLowerCase().includes(q));
  }, [data, debouncedSearch]);

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", description: "", program_id: "", assigned_to: "", status: "assigned", score: "", max_score: 100, feedback: "" });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      title: row.title, description: row.description || "", program_id: row.program_id || "", assigned_to: row.assigned_to || "",
      status: row.status, score: row.score ?? "", max_score: row.max_score ?? 100, feedback: row.feedback || "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.assigned_to || !form.program_id) {
      toast.error("Please provide a title, program, and assigned student.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description || null,
        program_id: form.program_id,
        assigned_to: form.assigned_to,
        status: form.status,
        score: form.score === "" ? null : Number(form.score),
        max_score: Number(form.max_score) || 100,
        feedback: form.feedback || null,
      };
      if (editing) {
        const { error } = await supabase.from("projects").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Project updated");
      } else {
        const { error } = await supabase.from("projects").insert(payload);
        if (error) throw error;
        toast.success("Project created");
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't save project."));
    } finally {
      setSaving(false);
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
        title="Projects"
        description="Manage and assign projects across all programs."
        action={<Button onClick={openNew}><Plus size={15} /> New project</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
          <option value="">All programs</option>
          {meta?.programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In progress</option>
          <option value="submitted">Submitted</option>
          <option value="completed">Completed</option>
        </Select>
      </div>

      {loading ? (
        <CardSkeleton count={3} />
      ) : filtered.length === 0 ? (
        <Card><EmptyState title="No projects found" icon={FolderKanban} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-ink-900 line-clamp-2">{p.title}</p>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-xs text-ink-400 mt-1">{p.student?.profile?.full_name} · {p.program?.name || "General"}</p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-ink-100">
                <span className="text-xs text-ink-400">{p.created_at && format(new Date(p.created_at), "MMM d, yyyy")}</span>
                <button onClick={() => openEdit(p)} className="text-xs font-medium text-ink-600 hover:text-ink-900">Manage</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Manage project" : "New project"} size="lg"
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></>}>
        <form className="space-y-4" onSubmit={handleSave}>
          <Input label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Textarea label="Description" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Program" value={form.program_id} onChange={(e) => setForm((f) => ({ ...f, program_id: e.target.value }))}>
              <option value="">Select program</option>
              {meta?.programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <Select label="Assign to student" value={form.assigned_to} onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}>
              <option value="">Select student</option>
              {meta?.students.map((s) => <option key={s.id} value={s.id}>{s.profile?.full_name}</option>)}
            </Select>
          </div>
          <Select label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In progress</option>
            <option value="submitted">Submitted</option>
            <option value="completed">Completed</option>
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Score" type="number" value={form.score} onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))} />
            <Input label="Max score" type="number" value={form.max_score} onChange={(e) => setForm((f) => ({ ...f, max_score: e.target.value }))} />
          </div>
          <Textarea label="Feedback" rows={2} value={form.feedback} onChange={(e) => setForm((f) => ({ ...f, feedback: e.target.value }))} />
        </form>
      </Modal>
    </AdminLayout>
  );
}
