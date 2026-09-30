import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { useConfirm } from "../../context/ConfirmContext";
import { PageHeader, Card, StatusBadge, Select, Button, Modal, Textarea } from "../../components/UI";
import { EmptyState, ErrorState, CardSkeleton } from "../../components/AsyncStates";
import { ClipboardList } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { friendlyError } from "../../lib/friendlyError";

export default function AdminApplications() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    let query = supabase
      .from("enrollment_applications")
      .select(
        "id, age, address, whatsapp_phone, guardian_name, guardian_phone, training_days, training_session, training_duration, amount_paid, cost_of_training, status, admin_notes, created_at, student:students(student_code, profile:profiles(full_name, email, phone)), program:programs(id, name, price, duration_weeks)"
      )
      .order("created_at", { ascending: false });
    if (statusFilter) query = query.eq("status", statusFilter);
    const { data, error } = await query;
    return { data, error };
  }, [statusFilter]);

  const handleApprove = async (app) => {
    const ok = await confirm({
      title: "Approve this application?",
      description: `${app.student?.profile?.full_name} will be enrolled in ${app.program?.name}.`,
      confirmLabel: "Approve & enroll",
      danger: false,
    });
    if (!ok) return;

    try {
      const { error: enrollErr } = await supabase.from("enrollments").insert({
        student_id: app.student_id ?? app.student?.id,
        program_id: app.program.id,
        status: "active",
        payment_status: Number(app.amount_paid) >= Number(app.cost_of_training || app.program.price) ? "paid" : Number(app.amount_paid) > 0 ? "partial" : "pending",
        enrollment_date: new Date().toISOString().slice(0, 10),
      });
      if (enrollErr) throw enrollErr;

      const { error: appErr } = await supabase
        .from("enrollment_applications")
        .update({ status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
        .eq("id", app.id);
      if (appErr) throw appErr;

      toast.success("Application approved and student enrolled");
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't approve this application."));
    }
  };

  const openReject = (app) => {
    setRejectModal(app);
    setRejectReason("");
  };

  const handleReject = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from("enrollment_applications")
        .update({ status: "rejected", admin_notes: rejectReason || null, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
        .eq("id", rejectModal.id);
      if (error) throw error;
      toast.success("Application rejected");
      setRejectModal(null);
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't reject this application."));
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
        title="Enrollment Applications"
        description="Review and approve new student enrollment requests."
        action={
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="">All</option>
          </Select>
        }
      />

      {loading ? (
        <CardSkeleton count={3} />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState title="No applications found" description="New signups with enrollment applications will appear here for review." icon={ClipboardList} />
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map((app) => (
            <Card key={app.id}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink-900">{app.student?.profile?.full_name}</p>
                  <p className="text-xs text-ink-400 mt-0.5">
                    {app.student?.student_code} · {app.student?.profile?.email} · Applied{" "}
                    {app.created_at && format(new Date(app.created_at), "MMM d, yyyy")}
                  </p>
                </div>
                <StatusBadge status={app.status} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-ink-100 text-sm">
                <div>
                  <p className="text-xs text-ink-400">Course</p>
                  <p className="text-ink-800 font-medium">{app.program?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-400">Schedule</p>
                  <p className="text-ink-800">{(app.training_days || []).join(", ")} · {app.training_session}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-400">Duration</p>
                  <p className="text-ink-800">{app.training_duration}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-400">Payment</p>
                  <p className="text-ink-800">₦{Number(app.amount_paid || 0).toLocaleString()} / ₦{Number(app.cost_of_training || app.program?.price || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                <div>
                  <p className="text-xs text-ink-400">Guardian</p>
                  <p className="text-ink-800">{app.guardian_name} {app.guardian_phone && `· ${app.guardian_phone}`}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-400">WhatsApp</p>
                  <p className="text-ink-800">{app.whatsapp_phone || "—"}</p>
                </div>
              </div>

              {app.admin_notes && (
                <p className="text-sm text-alert-600 mt-3 pt-3 border-t border-ink-100">{app.admin_notes}</p>
              )}

              {app.status === "pending" && (
                <div className="flex gap-2 mt-4 pt-4 border-t border-ink-100 justify-end">
                  <Button variant="outline" size="sm" onClick={() => openReject(app)}>Reject</Button>
                  <Button size="sm" onClick={() => handleApprove(app)}>Approve & enroll</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!rejectModal}
        onClose={() => setRejectModal(null)}
        title="Reject application"
        footer={<><Button variant="outline" onClick={() => setRejectModal(null)}>Cancel</Button><Button variant="danger" onClick={handleReject} disabled={saving}>{saving ? "Rejecting..." : "Reject"}</Button></>}
      >
        <form onSubmit={handleReject}>
          <Textarea label="Reason (optional, shown to the applicant)" rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
        </form>
      </Modal>
    </AdminLayout>
  );
}
