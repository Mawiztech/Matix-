import { useState } from "react";
import FacilitatorLayout from "./FacilitatorLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, Select, Input, Button, Modal, Textarea, ProgressBar } from "../../components/UI";
import { EmptyState, ErrorState, CardSkeleton } from "../../components/AsyncStates";
import { TrendingUp, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { friendlyError } from "../../lib/friendlyError";
import { format } from "date-fns";

export default function FacProgress() {
  const { user } = useAuth();
  const [programFilter, setProgramFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ student_id: "", program_id: "", percentage: "", status: "in_progress", notes: "" });
  const [saving, setSaving] = useState(false);

  const { data: meta } = useSupabaseQuery(async () => {
    if (!user) return { data: null };
    const { data: fp } = await supabase.from("facilitator_programs").select("program:programs(id, name)").eq("facilitator_id", user.id);
    const programIds = (fp || []).map((r) => r.program?.id).filter(Boolean);
    let students = [];
    if (programIds.length) {
      const { data: enr } = await supabase.from("enrollments").select("program_id, student:students(id, student_code, profile:profiles(full_name))").in("program_id", programIds);
      students = enr || [];
    }
    return { data: { programs: (fp || []).map((r) => r.program).filter(Boolean), enrollments: students } };
  }, [user?.id]);

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    if (!user || !meta) return { data: null };
    const programIds = meta.programs.map((p) => p.id);
    if (programIds.length === 0) return { data: [] };

    let query = supabase
      .from("progress")
      .select("id, percentage, status, notes, updated_at, program_id, student_id, program:programs(name), student:students(student_code, profile:profiles(full_name))")
      .in("program_id", programIds)
      .order("updated_at", { ascending: false });
    if (programFilter) query = query.eq("program_id", programFilter);

    const { data, error } = await query;
    return { data, error };
  }, [user?.id, meta, programFilter]);

  const studentsForProgram = (programId) =>
    (meta?.enrollments || []).filter((e) => e.program_id === programId).map((e) => e.student).filter(Boolean);

  const openNew = () => {
    setEditing(null);
    setForm({ student_id: "", program_id: meta?.programs[0]?.id || "", percentage: "", status: "in_progress", notes: "" });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({ student_id: row.student_id, program_id: row.program_id, percentage: row.percentage, status: row.status || "in_progress", notes: row.notes || "" });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const pct = Number(form.percentage);
    if (!form.student_id || !form.program_id || Number.isNaN(pct) || pct < 0 || pct > 100) {
      toast.error("Please provide a valid student, program and percentage (0-100).");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("progress").update({
          percentage: pct, status: form.status, notes: form.notes || null, updated_at: new Date().toISOString(),
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Progress updated");
      } else {
        const { error } = await supabase.from("progress").insert({
          student_id: form.student_id, program_id: form.program_id, percentage: pct, status: form.status, notes: form.notes || null, updated_by: user.id,
        });
        if (error) throw error;
        toast.success("Progress recorded");
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't save progress."));
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
      <PageHeader
        title="Progress"
        description="Track and update student progress and milestones."
        action={<Button onClick={openNew}><Plus size={15} /> Add progress record</Button>}
      />

      <div className="mb-5 max-w-xs">
        <Select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
          <option value="">All programs</option>
          {meta?.programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      {loading ? (
        <CardSkeleton count={3} />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState title="No progress has been recorded yet" description="Add a progress record for a student to get started." icon={TrendingUp} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink-900">{p.student?.profile?.full_name}</p>
                  <p className="text-xs text-ink-400">{p.program?.name}</p>
                </div>
                <button onClick={() => openEdit(p)} className="text-xs font-medium text-ink-600 hover:text-ink-900 shrink-0">Edit</button>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ink-500 capitalize">{p.status?.replace(/_/g, " ")}</span>
                  <span className="font-semibold text-ink-800">{p.percentage}%</span>
                </div>
                <ProgressBar percentage={Number(p.percentage)} colorClass="bg-warn-500" />
              </div>
              {p.notes && <p className="text-xs text-ink-500 mt-3 pt-3 border-t border-ink-100">{p.notes}</p>}
              <p className="text-[11px] text-ink-400 mt-2">Updated {p.updated_at && format(new Date(p.updated_at), "MMM d, yyyy")}</p>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit progress" : "Add progress record"}
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></>}
      >
        <form className="space-y-4" onSubmit={handleSave}>
          <Select label="Program" value={form.program_id} onChange={(e) => setForm((f) => ({ ...f, program_id: e.target.value, student_id: "" }))} disabled={!!editing}>
            <option value="">Select program</option>
            {meta?.programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select label="Student" value={form.student_id} onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))} disabled={!!editing}>
            <option value="">Select student</option>
            {studentsForProgram(form.program_id).map((s) => <option key={s.id} value={s.id}>{s.profile?.full_name} ({s.student_code})</option>)}
          </Select>
          <Input label="Percentage complete" type="number" min="0" max="100" value={form.percentage} onChange={(e) => setForm((f) => ({ ...f, percentage: e.target.value }))} />
          <Select label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </Select>
          <Textarea label="Milestone / notes" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </form>
      </Modal>
    </FacilitatorLayout>
  );
}
