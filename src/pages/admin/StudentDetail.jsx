import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, StatusBadge, ProgressBar, Button, Select, Modal } from "../../components/UI";
import { CardSkeleton, EmptyState, ErrorState } from "../../components/AsyncStates";
import { ArrowLeft, Pencil, ShieldAlert, KeyRound, Mail } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { friendlyError } from "../../lib/friendlyError";

const TABS = ["Enrollment", "Attendance", "Progress", "Payments", "Projects", "Grades"];

const ACCOUNT_STATUSES = ["active", "suspended", "inactive"];
const ENROLLMENT_STATUSES = ["active", "completed", "withdrawn", "suspended"];
const PAYMENT_STATUSES = ["pending", "partial", "paid", "refunded"];

export default function AdminStudentDetail() {
  const { id } = useParams();
  const [tab, setTab] = useState("Enrollment");
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({ account_status: "active", student_status: "active", email: "" });
  const [savingStatus, setSavingStatus] = useState(false);
  const [editingEnrollmentId, setEditingEnrollmentId] = useState(null);
  const [enrollmentForm, setEnrollmentForm] = useState({ status: "active", payment_status: "pending" });
  const [savingEnrollment, setSavingEnrollment] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [tempPasswordModal, setTempPasswordModal] = useState(null);

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    const [profileRes, studentRes, enrollmentsRes, attendanceRes, progressRes, paymentsRes, projectsRes, gradesRes] = await Promise.all([
      supabase.from("profiles").select("full_name, email, phone, status").eq("id", id).maybeSingle(),
      supabase.from("students").select("student_code, status, gender, date_of_birth, address").eq("id", id).maybeSingle(),
      supabase.from("enrollments").select("id, status, payment_status, enrollment_date, program:programs(name)").eq("student_id", id),
      supabase.from("attendance").select("status, session_date").eq("student_id", id).order("session_date", { ascending: false }).limit(20),
      supabase.from("progress").select("percentage, status, program:programs(name)").eq("student_id", id),
      supabase.from("payments").select("id, amount, status, payment_date, method").eq("student_id", id).order("payment_date", { ascending: false }),
      supabase.from("projects").select("id, title, status, score, max_score").eq("assigned_to", id),
      supabase.from("final_grades").select("id, total_score, letter_grade, program:programs(name)").eq("student_id", id),
    ]);
    const err = [profileRes, studentRes, enrollmentsRes, attendanceRes, progressRes, paymentsRes, projectsRes, gradesRes].find((r) => r.error);
    if (err) return { error: err.error };
    return {
      data: {
        profile: profileRes.data, student: studentRes.data, enrollments: enrollmentsRes.data || [],
        attendance: attendanceRes.data || [], progress: progressRes.data || [], payments: paymentsRes.data || [],
        projects: projectsRes.data || [], grades: gradesRes.data || [],
      },
    };
  }, [id]);

  const openStatusModal = () => {
    setStatusForm({
      account_status: data.profile.status || "active",
      student_status: data.student?.status || "active",
      email: data.profile.email || "",
    });
    setStatusModalOpen(true);
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    const emailChanged = statusForm.email.trim().toLowerCase() !== (data.profile.email || "").toLowerCase();
    if (emailChanged && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(statusForm.email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSavingStatus(true);
    try {
      const [profileRes, studentRes] = await Promise.all([
        supabase.from("profiles").update({ status: statusForm.account_status }).eq("id", id),
        supabase.from("students").update({ status: statusForm.student_status }).eq("id", id),
      ]);
      if (profileRes.error) throw profileRes.error;
      if (studentRes.error) throw studentRes.error;

      // Email lives in Supabase Auth, not the profiles table, so changing it
      // is delegated to the admin-users Edge Function (service-role only) —
      // the same reason account creation doesn't happen client-side.
      if (emailChanged) {
        const { data: result, error: fnError } = await supabase.functions.invoke("admin-users", {
          body: { action: "update-email", userId: id, email: statusForm.email.trim() },
        });
        if (fnError) throw fnError;
        if (result?.error) throw new Error(result.error);
      }

      toast.success("Student updated");
      setStatusModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't update student."));
    } finally {
      setSavingStatus(false);
    }
  };

  const handleResetPassword = async () => {
    setResettingPassword(true);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke("admin-users", {
        body: { action: "reset-password", userId: id },
      });
      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);
      setTempPasswordModal(result.temporaryPassword);
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't reset password."));
    } finally {
      setResettingPassword(false);
    }
  };

  const openEnrollmentEdit = (enr) => {
    setEditingEnrollmentId(enr.id);
    setEnrollmentForm({ status: enr.status, payment_status: enr.payment_status });
  };

  const handleSaveEnrollment = async (enrollmentId) => {
    setSavingEnrollment(true);
    try {
      const { error } = await supabase
        .from("enrollments")
        .update({ status: enrollmentForm.status, payment_status: enrollmentForm.payment_status })
        .eq("id", enrollmentId);
      if (error) throw error;
      toast.success("Enrollment updated");
      setEditingEnrollmentId(null);
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't update enrollment."));
    } finally {
      setSavingEnrollment(false);
    }
  };

  if (error) {
    return (
      <AdminLayout>
        <ErrorState onRetry={refetch} />
      </AdminLayout>
    );
  }

  const attendancePct = data?.attendance.length
    ? Math.round((data.attendance.filter((a) => a.status === "present").length / data.attendance.length) * 100)
    : null;

  return (
    <AdminLayout>
      <Link to="/admin/students" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 mb-4">
        <ArrowLeft size={15} /> Back to students
      </Link>

      {loading ? (
        <CardSkeleton count={2} />
      ) : !data?.profile ? (
        <Card><p className="text-sm text-ink-500 text-center py-8">Student not found.</p></Card>
      ) : (
        <>
          <PageHeader
            title={data.profile.full_name}
            description={`${data.student?.student_code || ""} · ${data.profile.email}`}
            action={
              <div className="flex items-center gap-2">
                <Link to={`/admin/conduct?student=${id}`}>
                  <Button variant="outline" size="sm"><ShieldAlert size={14} /> Conduct records</Button>
                </Link>
                <Button size="sm" onClick={openStatusModal}><Pencil size={14} /> Edit status</Button>
              </div>
            }
          />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <Card><p className="text-xs text-ink-400">Account status</p><div className="mt-1"><StatusBadge status={data.profile.status} /></div></Card>
            <Card><p className="text-xs text-ink-400">Student status</p><div className="mt-1"><StatusBadge status={data.student?.status} /></div></Card>
            <Card><p className="text-xs text-ink-400">Attendance</p><p className="font-display text-xl font-semibold text-ink-900 mt-1">{attendancePct != null ? `${attendancePct}%` : "—"}</p></Card>
            <Card><p className="text-xs text-ink-400">Projects</p><p className="font-display text-xl font-semibold text-ink-900 mt-1">{data.projects.length}</p></Card>
          </div>

          <div className="flex gap-1 overflow-x-auto scrollbar-thin border-b border-ink-200 mb-5">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t ? "border-signal-600 text-ink-900" : "border-transparent text-ink-400 hover:text-ink-700"}`}>
                {t}
              </button>
            ))}
          </div>

          <Card>
            {tab === "Enrollment" && (
              data.enrollments.length === 0 ? <EmptyState title="No enrollments" /> : (
                <div className="divide-y divide-ink-100">
                  {data.enrollments.map((e) => (
                    <div key={e.id} className="py-3 first:pt-0 last:pb-0 text-sm">
                      {editingEnrollmentId === e.id ? (
                        <div className="flex flex-wrap items-end gap-3">
                          <div>
                            <p className="font-medium text-ink-900 mb-2">{e.program?.name}</p>
                            <div className="flex flex-wrap gap-2">
                              <Select value={enrollmentForm.status} onChange={(ev) => setEnrollmentForm((f) => ({ ...f, status: ev.target.value }))} className="w-40">
                                {ENROLLMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                              </Select>
                              <Select value={enrollmentForm.payment_status} onChange={(ev) => setEnrollmentForm((f) => ({ ...f, payment_status: ev.target.value }))} className="w-40">
                                {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                              </Select>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveEnrollment(e.id)} disabled={savingEnrollment}>{savingEnrollment ? "Saving..." : "Save"}</Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingEnrollmentId(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div><p className="font-medium text-ink-900">{e.program?.name}</p><p className="text-xs text-ink-400">{e.enrollment_date && format(new Date(e.enrollment_date), "MMM d, yyyy")}</p></div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={e.status} /><StatusBadge status={e.payment_status} />
                            <button onClick={() => openEnrollmentEdit(e)} className="text-ink-400 hover:text-ink-900 ml-1" aria-label="Edit enrollment">
                              <Pencil size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
            {tab === "Attendance" && (
              data.attendance.length === 0 ? <EmptyState title="No attendance recorded" /> : (
                <div className="divide-y divide-ink-100">
                  {data.attendance.map((a, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 text-sm">
                      <span className="text-ink-700">{format(new Date(a.session_date), "MMM d, yyyy")}</span>
                      <StatusBadge status={a.status} />
                    </div>
                  ))}
                </div>
              )
            )}
            {tab === "Progress" && (
              data.progress.length === 0 ? <EmptyState title="No progress has been recorded yet" /> : (
                <div className="space-y-3">
                  {data.progress.map((p, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1"><span className="text-ink-600">{p.program?.name}</span><span className="font-medium text-ink-800">{p.percentage}%</span></div>
                      <ProgressBar percentage={Number(p.percentage)} />
                    </div>
                  ))}
                </div>
              )
            )}
            {tab === "Payments" && (
              data.payments.length === 0 ? <EmptyState title="No payment records" /> : (
                <div className="divide-y divide-ink-100">
                  {data.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 text-sm">
                      <span className="text-ink-700">{p.payment_date && format(new Date(p.payment_date), "MMM d, yyyy")} · {p.method}</span>
                      <div className="flex items-center gap-3"><span className="font-medium">₦{Number(p.amount).toLocaleString()}</span><StatusBadge status={p.status} /></div>
                    </div>
                  ))}
                </div>
              )
            )}
            {tab === "Projects" && (
              data.projects.length === 0 ? <EmptyState title="No projects assigned" /> : (
                <div className="divide-y divide-ink-100">
                  {data.projects.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 text-sm">
                      <span className="text-ink-700">{p.title}</span>
                      <div className="flex items-center gap-3">{p.score != null && <span>{p.score}/{p.max_score}</span>}<StatusBadge status={p.status} /></div>
                    </div>
                  ))}
                </div>
              )
            )}
            {tab === "Grades" && (
              data.grades.length === 0 ? <EmptyState title="No grades recorded yet" /> : (
                <div className="divide-y divide-ink-100">
                  {data.grades.map((g) => (
                    <div key={g.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 text-sm">
                      <span className="text-ink-700">{g.program?.name}</span>
                      <span className="font-medium">{g.total_score}% ({g.letter_grade})</span>
                    </div>
                  ))}
                </div>
              )
            )}
          </Card>

          <Modal
            open={statusModalOpen}
            onClose={() => setStatusModalOpen(false)}
            title="Edit student"
            footer={
              <>
                <Button variant="outline" onClick={() => setStatusModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveStatus} disabled={savingStatus}>{savingStatus ? "Saving..." : "Save"}</Button>
              </>
            }
          >
            <form className="space-y-4" onSubmit={handleSaveStatus}>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">Email address</label>
                <input
                  type="email"
                  value={statusForm.email}
                  onChange={(e) => setStatusForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-card border border-ink-300 px-3.5 py-2.5 text-sm text-ink-900 focus:border-signal-600 focus:ring-1 focus:ring-signal-600 outline-none transition-colors"
                />
                <p className="text-xs text-ink-400 mt-1">Changing this updates the student's login email immediately — no confirmation link is sent.</p>
              </div>
              <Select
                label="Account status"
                value={statusForm.account_status}
                onChange={(e) => setStatusForm((f) => ({ ...f, account_status: e.target.value }))}
              >
                {ACCOUNT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Select
                label="Student record status"
                value={statusForm.student_status}
                onChange={(e) => setStatusForm((f) => ({ ...f, student_status: e.target.value }))}
              >
                {ACCOUNT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
              <p className="text-xs text-ink-400">
                Setting either status to "suspended" restricts the student's portal
                access. Use conduct records (link above) to log the incident that led
                to a suspension.
              </p>
              <div className="pt-3 border-t border-ink-100">
                <Button type="button" variant="outline" size="sm" onClick={handleResetPassword} disabled={resettingPassword}>
                  <KeyRound size={14} /> {resettingPassword ? "Resetting..." : "Reset password"}
                </Button>
                <p className="text-xs text-ink-400 mt-1.5">Generates a new temporary password to share with the student.</p>
              </div>
            </form>
          </Modal>

          <Modal
            open={!!tempPasswordModal}
            onClose={() => setTempPasswordModal(null)}
            title="Password reset"
            footer={<Button onClick={() => setTempPasswordModal(null)}>Done</Button>}
          >
            <p className="text-sm text-ink-600 mb-3">
              Share this temporary password with the student securely. It won't be shown again.
            </p>
            <div className="rounded-card bg-ink-50 border border-ink-200 px-4 py-3 font-mono text-base text-ink-900 text-center select-all">
              {tempPasswordModal}
            </div>
          </Modal>
        </>
      )}
    </AdminLayout>
  );
}
