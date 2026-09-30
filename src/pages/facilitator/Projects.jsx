import { useState } from "react";
import FacilitatorLayout from "./FacilitatorLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, StatusBadge, Select, Input, Textarea, Button, Modal } from "../../components/UI";
import { EmptyState, ErrorState, CardSkeleton } from "../../components/AsyncStates";
import { FolderKanban, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { friendlyError } from "../../lib/friendlyError";

export default function FacProjects() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [gradingRow, setGradingRow] = useState(null);
  const [gradeForm, setGradeForm] = useState({ score: "", feedback: "", status: "in_progress" });
  const [form, setForm] = useState({ title: "", description: "", program_id: "", assigned_to: "", max_score: 100 });
  const [saving, setSaving] = useState(false);

  const { data: meta } = useSupabaseQuery(async () => {
    if (!user) return { data: null };
    const { data: fp } = await supabase.from("facilitator_programs").select("program:programs(id, name)").eq("facilitator_id", user.id);
    const programIds = (fp || []).map((r) => r.program?.id).filter(Boolean);
    let students = [];
    if (programIds.length) {
      const { data: enr } = await supabase.from("enrollments").select("program_id, student:students(id, profile:profiles(full_name))").in("program_id", programIds);
      students = enr || [];
    }
    return { data: { programs: (fp || []).map((r) => r.program).filter(Boolean), enrollments: students } };
  }, [user?.id]);

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    if (!user) return { data: null };
    const { data, error } = await supabase
      .from("projects")
      .select("id, title, description, status, score, max_score, feedback, program:programs(name), student:students(profile:profiles(full_name))")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });
    return { data, error };
  }, [user?.id]);

  const studentsForProgram = (programId) =>
    (meta?.enrollments || []).filter((e) => e.program_id === programId).map((e) => e.student).filter(Boolean);

  const openNew = () => {
    setForm({ title: "", description: "", program_id: meta?.programs[0]?.id || "", assigned_to: "", max_score: 100 });
    setModalOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.program_id || !form.assigned_to) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("projects").insert({
        title: form.title.trim(), description: form.description || null, program_id: form.program_id,
        assigned_to: form.assigned_to, max_score: Number(form.max_score) || 100, status: "assigned", created_by: user.id,
      });
      if (error) throw error;
      toast.success("Project assigned");
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't create project."));
    } finally {
      setSaving(false);
    }
  };

  const openGrade = (row) => {
    setGradingRow(row);
    setGradeForm({ score: row.score ?? "", feedback: row.feedback || "", status: row.status });
  };

  const handleGradeSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from("projects").update({
        score: gradeForm.score === "" ? null : Number(gradeForm.score),
        feedback: gradeForm.feedback || null,
        status: gradeForm.status,
      }).eq("id", gradingRow.id);
      if (error) throw error;
      toast.success("Project updated");
      setGradingRow(null);
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't update project."));
    } finally {
      setSaving(false);
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
      <PageHeader title="Projects" description="Assign and review student projects." action={<Button onClick={openNew}><Plus size={15} /> Assign project</Button>} />

      {loading ? (
        <CardSkeleton count={3} />
      ) : !data || data.length === 0 ? (
        <Card><EmptyState title="No projects yet" description="Assign a project to a student to get started." icon={FolderKanban} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-ink-900 line-clamp-2">{p.title}</p>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-xs text-ink-400 mt-1">{p.student?.profile?.full_name} · {p.program?.name}</p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-ink-100">
                <span className="text-sm text-ink-600">{p.score != null ? `${p.score}/${p.max_score}` : "Not graded"}</span>
                <button onClick={() => openGrade(p)} className="text-xs font-medium text-ink-600 hover:text-ink-900">Update</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Assign project" size="lg"
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving}>{saving ? "Assigning..." : "Assign"}</Button></>}>
        <form className="space-y-4" onSubmit={handleCreate}>
          <Input label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Textarea label="Description" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <Select label="Program" value={form.program_id} onChange={(e) => setForm((f) => ({ ...f, program_id: e.target.value, assigned_to: "" }))}>
            <option value="">Select program</option>
            {meta?.programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select label="Student" value={form.assigned_to} onChange={(e) => setForm((f) => ({ ...f, assigned_to: e.target.value }))}>
            <option value="">Select student</option>
            {studentsForProgram(form.program_id).map((s) => <option key={s.id} value={s.id}>{s.profile?.full_name}</option>)}
          </Select>
          <Input label="Max score" type="number" value={form.max_score} onChange={(e) => setForm((f) => ({ ...f, max_score: e.target.value }))} />
        </form>
      </Modal>

      <Modal open={!!gradingRow} onClose={() => setGradingRow(null)} title="Update project"
        footer={<><Button variant="outline" onClick={() => setGradingRow(null)}>Cancel</Button><Button onClick={handleGradeSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></>}>
        <form className="space-y-4" onSubmit={handleGradeSave}>
          <Select label="Status" value={gradeForm.status} onChange={(e) => setGradeForm((f) => ({ ...f, status: e.target.value }))}>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In progress</option>
            <option value="submitted">Submitted</option>
            <option value="completed">Completed</option>
          </Select>
          <Input label="Score" type="number" value={gradeForm.score} onChange={(e) => setGradeForm((f) => ({ ...f, score: e.target.value }))} />
          <Textarea label="Feedback" rows={3} value={gradeForm.feedback} onChange={(e) => setGradeForm((f) => ({ ...f, feedback: e.target.value }))} />
        </form>
      </Modal>
    </FacilitatorLayout>
  );
}
