import { useMemo, useState } from "react";
import AdminLayout from "./AdminLayout";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, StatusBadge, StatCard, Select, Input, Button, Modal } from "../../components/UI";
import DataTable from "../../components/DataTable";
import { EmptyState, ErrorState, StatSkeleton } from "../../components/AsyncStates";
import { CreditCard, Plus } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { friendlyError } from "../../lib/friendlyError";

export default function AdminPayments() {
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ enrollment_id: "", amount: "", method: "bank_transfer", status: "paid" });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: enrollments } = useSupabaseQuery(async () => {
    const { data } = await supabase.from("enrollments").select("id, student_id, student:students(profile:profiles(full_name)), program:programs(name)");
    return { data: data || [] };
  }, []);

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    let query = supabase
      .from("payments")
      .select("id, amount, status, method, payment_date, enrollment:enrollments(student:students(profile:profiles(full_name)), program:programs(name))")
      .order("payment_date", { ascending: false });
    if (statusFilter) query = query.eq("status", statusFilter);
    const { data, error } = await query;
    return { data, error };
  }, [statusFilter]);

  const totals = useMemo(() => {
    if (!data) return null;
    const paid = data.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
    const pending = data.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);
    return { paid, pending, count: data.length };
  }, [data]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.enrollment_id || !form.amount) {
      toast.error("Please select an enrollment and enter an amount.");
      return;
    }
    const enrollment = enrollments?.find((e) => e.id === form.enrollment_id);
    if (!enrollment) {
      toast.error("Please select a valid enrollment.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("payments").insert({
        enrollment_id: form.enrollment_id,
        student_id: enrollment.student_id,
        amount: Number(form.amount), method: form.method, status: form.status,
        payment_date: new Date().toISOString().slice(0, 10),
      });
      if (error) throw error;
      toast.success("Payment recorded");
      setModalOpen(false);
      setForm({ enrollment_id: "", amount: "", method: "bank_transfer", status: "paid" });
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't record payment."));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    const { error } = await supabase.from("payments").update({ status }).eq("id", id);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success("Payment status updated");
    setEditing(null);
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
      <PageHeader title="Payments" description="Track and record student payments." action={<Button onClick={() => setModalOpen(true)}><Plus size={15} /> Record payment</Button>} />

      {loading ? (
        <StatSkeleton count={3} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard label="Total Paid" value={`₦${totals.paid.toLocaleString()}`} accent="emerald" />
          <StatCard label="Outstanding" value={`₦${totals.pending.toLocaleString()}`} accent="rose" />
          <StatCard label="Total Records" value={totals.count} accent="ink" />
        </div>
      )}

      <div className="mb-5 max-w-xs">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="partial">Partial</option>
          <option value="refunded">Refunded</option>
        </Select>
      </div>

      <Card>
        {!loading && (!data || data.length === 0) ? (
          <EmptyState title="No payment records" icon={CreditCard} />
        ) : (
          <DataTable
            loading={loading}
            rows={data || []}
            columns={[
              { key: "student", header: "Student", render: (r) => r.enrollment?.student?.profile?.full_name },
              { key: "program", header: "Program", render: (r) => r.enrollment?.program?.name },
              { key: "amount", header: "Amount", render: (r) => `₦${Number(r.amount).toLocaleString()}` },
              { key: "method", header: "Method", render: (r) => r.method?.replace(/_/g, " ") },
              { key: "date", header: "Date", render: (r) => r.payment_date && format(new Date(r.payment_date), "MMM d, yyyy") },
              { key: "status", header: "Status", render: (r) => (
                editing === r.id ? (
                  <Select autoFocus defaultValue={r.status} onChange={(e) => handleStatusChange(r.id, e.target.value)} onBlur={() => setEditing(null)} className="!py-1 text-xs">
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                    <option value="refunded">Refunded</option>
                  </Select>
                ) : (
                  <button onClick={() => setEditing(r.id)}><StatusBadge status={r.status} /></button>
                )
              ) },
            ]}
          />
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record payment"
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving}>{saving ? "Saving..." : "Record"}</Button></>}>
        <form className="space-y-4" onSubmit={handleCreate}>
          <Select label="Enrollment" value={form.enrollment_id} onChange={(e) => setForm((f) => ({ ...f, enrollment_id: e.target.value }))}>
            <option value="">Select enrollment</option>
            {enrollments?.map((e) => <option key={e.id} value={e.id}>{e.student?.profile?.full_name} — {e.program?.name}</option>)}
          </Select>
          <Input label="Amount" type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          <Select label="Method" value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}>
            <option value="bank_transfer">Bank transfer</option>
            <option value="card">Card</option>
            <option value="cash">Cash</option>
            <option value="online">Online</option>
          </Select>
          <Select label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
          </Select>
        </form>
      </Modal>
    </AdminLayout>
  );
}
