import { useState } from "react";
import FacilitatorLayout from "./FacilitatorLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, StatusBadge, Select, Input, Textarea, Button, Modal } from "../../components/UI";
import { EmptyState, ErrorState, CardSkeleton } from "../../components/AsyncStates";
import { ShieldAlert, Plus } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { friendlyError } from "../../lib/friendlyError";

export default function FacConduct() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ student_id: "", program_id: "", category: "", description: "", severity: "note", occurred_at: "" });
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
      .from("professional_conduct")
      .select("id, category, description, severity, score, max_score, occurred_at, student_id, program_id, student:students(profile:profiles(full_name)), program:programs(name)")
      .eq("recorded_by", user.id)
      .order("occurred_at", { ascending: false });
    return { data, error };
  }, [user?.id]);

  const studentsForProgram = (programId) =>
    (meta?.enrollments || []).filter((e) => e.program_id === programId).map((e) => e.student).filter(Boolean);

  const openNew = () => {
    setEditing(null);
    setForm({ student_id: "", program_id: meta?.programs[0]?.id || "", category: "", description: "", severity: "note", occurred_at: format(new Date(), "yyyy-MM-dd") });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({ student_id: row.student_id, program_id: row.program_id || "", category: row.category || "", description: row.description || "", severity: row.severity, occurred_at: row.occurred_at });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.student_id || !form.occurred_at) {
      toast.error("Please select a student and date.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("professional_conduct").update({
          category: form.category || null, description: form.description || null, severity: form.severity, occurred_at: form.occurred_at,
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Record updated");
      } else {
        const { error } = await supabase.from("professional_conduct").insert({
          student_id: form.student_id, program_id: form.program_id || null, category: form.category || null,
          description: form.description || null, severity: form.severity, occurred_at: form.occurred_at, recorded_by: user.id,
        });
        if (error) throw error;
        toast.success("Conduct record added");
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't save record."));
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
      <PageHeader title="Professional Conduct" description="Track conduct evaluations for your students." action={<Button onClick={openNew}><Plus size={15} /> Add record</Button>} />

      {loading ? (
        <CardSkeleton count={3} />
      ) : !data || data.length === 0 ? (
        <Card><EmptyState title="No conduct records yet" icon={ShieldAlert} /></Card>
      ) : (
        <div className="space-y-3">
          {data.map((r) => (
            <Card key={r.id} className="!p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink-900">{r.student?.profile?.full_name}</p>
                    <StatusBadge status={r.severity} />
                  </div>
                  <p className="text-xs text-ink-400 mt-0.5">{r.program?.name} · {r.category || "General"} · {format(new Date(r.occurred_at), "MMM d, yyyy")}</p>
                  {r.description && <p className="text-sm text-ink-600 mt-2">{r.description}</p>}
                </div>
                <button onClick={() => openEdit(r)} className="text-xs font-medium text-ink-600 hover:text-ink-900 shrink-0">Edit</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit record" : "Add conduct record"}
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></>}>
        <form className="space-y-4" onSubmit={handleSave}>
          <Select label="Program" value={form.program_id} onChange={(e) => setForm((f) => ({ ...f, program_id: e.target.value, student_id: "" }))} disabled={!!editing}>
            <option value="">Select program</option>
            {meta?.programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select label="Student" value={form.student_id} onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))} disabled={!!editing}>
            <option value="">Select student</option>
            {studentsForProgram(form.program_id).map((s) => <option key={s.id} value={s.id}>{s.profile?.full_name}</option>)}
          </Select>
          <Input label="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Punctuality, Communication" />
          <Select label="Severity" value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
            <option value="note">Note</option>
            <option value="minor">Minor</option>
            <option value="major">Major</option>
            <option value="critical">Critical</option>
          </Select>
          <Input label="Date" type="date" value={form.occurred_at} onChange={(e) => setForm((f) => ({ ...f, occurred_at: e.target.value }))} />
          <Textarea label="Description" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </form>
      </Modal>
    </FacilitatorLayout>
  );
}
