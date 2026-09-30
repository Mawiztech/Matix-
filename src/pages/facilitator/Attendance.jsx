import { useEffect, useMemo, useState } from "react";
import FacilitatorLayout from "./FacilitatorLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, StatusBadge, Select, Input, Button, Modal, Textarea } from "../../components/UI";
import DataTable from "../../components/DataTable";
import { EmptyState, ErrorState } from "../../components/AsyncStates";
import { CheckSquare, Plus } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { friendlyError } from "../../lib/friendlyError";

export default function FacAttendance() {
  const { user } = useAuth();
  const [programFilter, setProgramFilter] = useState("");
  const [studentFilter, setStudentFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ student_id: "", program_id: "", session_date: "", session_label: "", status: "present", notes: "" });
  const [saving, setSaving] = useState(false);

  const { data: meta } = useSupabaseQuery(async () => {
    if (!user) return { data: null };
    const { data: fp } = await supabase.from("facilitator_programs").select("program:programs(id, name)").eq("facilitator_id", user.id);
    const programIds = (fp || []).map((r) => r.program?.id).filter(Boolean);
    let students = [];
    if (programIds.length) {
      const { data: enr } = await supabase.from("enrollments").select("student:students(id, student_code, profile:profiles(full_name))").in("program_id", programIds);
      const seen = new Map();
      (enr || []).forEach((e) => e.student && seen.set(e.student.id, e.student));
      students = Array.from(seen.values());
    }
    return { data: { programs: (fp || []).map((r) => r.program).filter(Boolean), students } };
  }, [user?.id]);

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    if (!user || !meta) return { data: null };
    const programIds = meta.programs.map((p) => p.id);
    if (programIds.length === 0) return { data: [] };

    let query = supabase
      .from("attendance")
      .select("id, session_date, session_label, status, notes, program_id, student_id, program:programs(name), student:students(student_code, profile:profiles(full_name))")
      .in("program_id", programIds)
      .order("session_date", { ascending: false });

    if (programFilter) query = query.eq("program_id", programFilter);
    if (studentFilter) query = query.eq("student_id", studentFilter);
    if (dateFilter) query = query.eq("session_date", dateFilter);

    const { data, error } = await query;
    return { data, error };
  }, [user?.id, meta, programFilter, studentFilter, dateFilter]);

  const openNew = () => {
    setEditing(null);
    setForm({ student_id: "", program_id: meta?.programs[0]?.id || "", session_date: format(new Date(), "yyyy-MM-dd"), session_label: "", status: "present", notes: "" });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({ student_id: row.student_id, program_id: row.program_id, session_date: row.session_date, session_label: row.session_label || "", status: row.status, notes: row.notes || "" });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.student_id || !form.program_id || !form.session_date) {
      toast.error("Please fill in student, program and date.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("attendance").update({
          status: form.status, notes: form.notes || null, session_label: form.session_label || null,
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Attendance updated");
      } else {
        const { error } = await supabase.from("attendance").insert({
          student_id: form.student_id,
          program_id: form.program_id,
          session_date: form.session_date,
          session_label: form.session_label || null,
          status: form.status,
          notes: form.notes || null,
          recorded_by: user.id,
        });
        if (error) throw error;
        toast.success("Attendance recorded");
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't save attendance."));
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
        title="Attendance"
        description="Record and manage attendance for your programs."
        action={<Button onClick={openNew}><Plus size={15} /> Record attendance</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <Select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
          <option value="">All programs</option>
          {meta?.programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select value={studentFilter} onChange={(e) => setStudentFilter(e.target.value)}>
          <option value="">All students</option>
          {meta?.students.map((s) => <option key={s.id} value={s.id}>{s.profile?.full_name}</option>)}
        </Select>
        <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
      </div>

      <Card>
        {!loading && (!data || data.length === 0) ? (
          <EmptyState title="No attendance records found" description="Record attendance for your students using the button above." icon={CheckSquare} />
        ) : (
          <DataTable
            loading={loading}
            rows={data || []}
            columns={[
              { key: "date", header: "Date", render: (r) => format(new Date(r.session_date), "MMM d, yyyy") },
              { key: "student", header: "Student", render: (r) => r.student?.profile?.full_name },
              { key: "program", header: "Program", render: (r) => r.program?.name },
              { key: "session", header: "Session", render: (r) => r.session_label || "—" },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
              { key: "actions", header: "", render: (r) => (
                <button onClick={() => openEdit(r)} className="text-xs font-medium text-ink-600 hover:text-ink-900">Edit</button>
              ) },
            ]}
          />
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit attendance" : "Record attendance"}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={handleSave}>
          <Select label="Student" value={form.student_id} onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))} disabled={!!editing}>
            <option value="">Select student</option>
            {meta?.students.map((s) => <option key={s.id} value={s.id}>{s.profile?.full_name} ({s.student_code})</option>)}
          </Select>
          <Select label="Program" value={form.program_id} onChange={(e) => setForm((f) => ({ ...f, program_id: e.target.value }))} disabled={!!editing}>
            <option value="">Select program</option>
            {meta?.programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Input label="Date" type="date" value={form.session_date} onChange={(e) => setForm((f) => ({ ...f, session_date: e.target.value }))} disabled={!!editing} />
          <Input label="Session label (optional)" value={form.session_label} onChange={(e) => setForm((f) => ({ ...f, session_label: e.target.value }))} />
          <Select label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="late">Late</option>
            <option value="excused">Excused</option>
          </Select>
          <Textarea label="Notes (optional)" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </form>
      </Modal>
    </FacilitatorLayout>
  );
}
