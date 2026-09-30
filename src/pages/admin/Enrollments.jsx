import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, StatusBadge, Select, Button, Modal } from "../../components/UI";
import DataTable from "../../components/DataTable";
import { EmptyState, ErrorState } from "../../components/AsyncStates";
import { ClipboardList, Plus } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { friendlyError } from "../../lib/friendlyError";

export default function AdminEnrollments() {
  const [statusFilter, setStatusFilter] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ student_id: "", program_id: "" });
  const [saving, setSaving] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);

  const { data: meta } = useSupabaseQuery(async () => {
    const [{ data: students }, { data: programs }] = await Promise.all([
      supabase.from("students").select("id, student_code, profile:profiles(full_name)"),
      supabase.from("programs").select("id, name"),
    ]);
    return { data: { students: students || [], programs: programs || [] } };
  }, []);

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    let query = supabase
      .from("enrollments")
      .select("id, status, payment_status, enrollment_date, student:students(student_code, profile:profiles(full_name)), program:programs(id, name)")
      .order("enrollment_date", { ascending: false });
    if (statusFilter) query = query.eq("status", statusFilter);
    if (programFilter) query = query.eq("program_id", programFilter);
    const { data, error } = await query;
    return { data, error };
  }, [statusFilter, programFilter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.student_id || !form.program_id) {
      toast.error("Please select a student and program.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("enrollments").insert({
        student_id: form.student_id, program_id: form.program_id, status: "active", payment_status: "pending",
      });
      if (error) throw error;
      toast.success("Enrollment created");
      setModalOpen(false);
      setForm({ student_id: "", program_id: "" });
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't create enrollment."));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    const { error } = await supabase.from("enrollments").update({ status }).eq("id", id);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success("Enrollment status updated");
    setEditingStatus(null);
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
      <PageHeader title="Enrollments" description="Manage student program enrollments." action={<Button onClick={() => setModalOpen(true)}><Plus size={15} /> New enrollment</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 max-w-lg">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="withdrawn">Withdrawn</option>
          <option value="suspended">Suspended</option>
        </Select>
        <Select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
          <option value="">All programs</option>
          {meta?.programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      <Card>
        {!loading && (!data || data.length === 0) ? (
          <EmptyState title="No enrollments found" icon={ClipboardList} />
        ) : (
          <DataTable
            loading={loading}
            rows={data || []}
            columns={[
              { key: "student", header: "Student", render: (r) => r.student?.profile?.full_name },
              { key: "program", header: "Program", render: (r) => r.program?.name },
              { key: "date", header: "Enrolled", render: (r) => r.enrollment_date && format(new Date(r.enrollment_date), "MMM d, yyyy") },
              { key: "payment", header: "Payment", render: (r) => <StatusBadge status={r.payment_status} /> },
              { key: "status", header: "Status", render: (r) => (
                editingStatus === r.id ? (
                  <Select autoFocus defaultValue={r.status} onChange={(e) => handleStatusChange(r.id, e.target.value)} onBlur={() => setEditingStatus(null)} className="!py-1 text-xs">
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="withdrawn">Withdrawn</option>
                    <option value="suspended">Suspended</option>
                  </Select>
                ) : (
                  <button onClick={() => setEditingStatus(r.id)}><StatusBadge status={r.status} /></button>
                )
              ) },
            ]}
          />
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New enrollment"
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create"}</Button></>}>
        <form className="space-y-4" onSubmit={handleCreate}>
          <Select label="Student" value={form.student_id} onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}>
            <option value="">Select student</option>
            {meta?.students.map((s) => <option key={s.id} value={s.id}>{s.profile?.full_name} ({s.student_code})</option>)}
          </Select>
          <Select label="Program" value={form.program_id} onChange={(e) => setForm((f) => ({ ...f, program_id: e.target.value }))}>
            <option value="">Select program</option>
            {meta?.programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </form>
      </Modal>
    </AdminLayout>
  );
}
