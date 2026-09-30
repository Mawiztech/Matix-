import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { useConfirm } from "../../context/ConfirmContext";
import { PageHeader, Card, StatusBadge, Input, Textarea, Select, Button, Modal } from "../../components/UI";
import { CardSkeleton, EmptyState, ErrorState } from "../../components/AsyncStates";
import { ArrowLeft, Pencil, BookOpen, Plus, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import { friendlyError } from "../../lib/friendlyError";

const FACILITATOR_STATUSES = ["active", "inactive", "suspended"];

export default function AdminFacilitatorDetail() {
  const { id } = useParams();
  const confirm = useConfirm();
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", specialization: "", bio: "", facilitator_code: "", status: "active" });
  const [saving, setSaving] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [tempPasswordModal, setTempPasswordModal] = useState(null);

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    const [profileRes, facRes, assignedRes, allProgramsRes] = await Promise.all([
      supabase.from("profiles").select("full_name, email, phone, status").eq("id", id).maybeSingle(),
      supabase.from("facilitators").select("facilitator_code, specialization, bio, status").eq("id", id).maybeSingle(),
      supabase.from("facilitator_programs").select("id, program:programs(id, name, program_code)").eq("facilitator_id", id),
      supabase.from("programs").select("id, name"),
    ]);
    const err = [profileRes, facRes, assignedRes, allProgramsRes].find((r) => r.error);
    if (err) return { error: err.error };
    return {
      data: {
        profile: profileRes.data,
        facilitator: facRes.data,
        assignments: assignedRes.data || [],
        allPrograms: allProgramsRes.data || [],
      },
    };
  }, [id]);

  const openEdit = () => {
    setForm({
      full_name: data.profile.full_name || "",
      email: data.profile.email || "",
      phone: data.profile.phone || "",
      specialization: data.facilitator?.specialization || "",
      bio: data.facilitator?.bio || "",
      facilitator_code: data.facilitator?.facilitator_code || "",
      status: data.facilitator?.status || "active",
    });
    setEditOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      toast.error("Please enter a name.");
      return;
    }
    const emailChanged = form.email.trim().toLowerCase() !== (data.profile.email || "").toLowerCase();
    if (emailChanged && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setSaving(true);
    try {
      const [profileRes, facRes] = await Promise.all([
        supabase.from("profiles").update({ full_name: form.full_name.trim(), phone: form.phone.trim() || null, status: form.status }).eq("id", id),
        supabase.from("facilitators").update({
          specialization: form.specialization.trim() || null,
          bio: form.bio.trim() || null,
          facilitator_code: form.facilitator_code.trim() || null,
          status: form.status,
        }).eq("id", id),
      ]);
      if (profileRes.error) throw profileRes.error;
      if (facRes.error) throw facRes.error;

      // Email lives in Supabase Auth, not the profiles table, so changing it
      // is delegated to the admin-users Edge Function (service-role only).
      if (emailChanged) {
        const { data: result, error: fnError } = await supabase.functions.invoke("admin-users", {
          body: { action: "update-email", userId: id, email: form.email.trim() },
        });
        if (fnError) throw fnError;
        if (result?.error) throw new Error(result.error);
      }

      toast.success("Facilitator profile updated");
      setEditOpen(false);
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't update facilitator."));
    } finally {
      setSaving(false);
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

  const handleAssign = async () => {
    if (!selectedProgram) return;
    try {
      const { error } = await supabase.from("facilitator_programs").insert({ facilitator_id: id, program_id: selectedProgram });
      if (error) throw error;
      toast.success("Program assigned");
      setSelectedProgram("");
      setAssignOpen(false);
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't assign program."));
    }
  };

  const handleRemove = async (assignmentId, programName) => {
    const ok = await confirm({
      title: "Remove program assignment?",
      description: `This facilitator will lose access to manage students in "${programName}".`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    const { error } = await supabase.from("facilitator_programs").delete().eq("id", assignmentId);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success("Program removed");
    refetch();
  };

  if (error) {
    return (
      <AdminLayout>
        <ErrorState onRetry={refetch} />
      </AdminLayout>
    );
  }

  const unassignedPrograms = data?.allPrograms.filter((p) => !data.assignments.some((a) => a.program?.id === p.id)) || [];

  return (
    <AdminLayout>
      <Link to="/admin/facilitators" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 mb-4">
        <ArrowLeft size={15} /> Back to facilitators
      </Link>

      {loading ? (
        <CardSkeleton count={2} />
      ) : !data?.profile ? (
        <Card><p className="text-sm text-ink-500 text-center py-8">Facilitator not found.</p></Card>
      ) : (
        <>
          <PageHeader
            title={data.profile.full_name}
            description={`${data.facilitator?.facilitator_code || "No code"} · ${data.profile.email}`}
            action={<Button size="sm" onClick={openEdit}><Pencil size={14} /> Edit profile</Button>}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card><p className="text-xs text-ink-400">Status</p><div className="mt-1"><StatusBadge status={data.facilitator?.status || data.profile.status} /></div></Card>
            <Card><p className="text-xs text-ink-400">Specialization</p><p className="text-sm font-medium text-ink-900 mt-1">{data.facilitator?.specialization || "—"}</p></Card>
            <Card><p className="text-xs text-ink-400">Programs assigned</p><p className="font-display text-xl font-semibold text-ink-900 mt-1">{data.assignments.length}</p></Card>
          </div>

          {data.facilitator?.bio && (
            <Card className="mb-6">
              <p className="text-xs text-ink-400 mb-1.5">Bio</p>
              <p className="text-sm text-ink-700">{data.facilitator.bio}</p>
            </Card>
          )}

          <Card title="Assigned programs" action={<Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}><Plus size={14} /> Assign program</Button>}>
            {data.assignments.length === 0 ? (
              <EmptyState title="No programs assigned" description="This facilitator can't see or message any students until they're assigned to a program." icon={BookOpen} />
            ) : (
              <div className="divide-y divide-ink-100">
                {data.assignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 text-sm">
                    <div>
                      <p className="font-medium text-ink-900">{a.program?.name}</p>
                      <p className="text-xs text-ink-400">{a.program?.program_code}</p>
                    </div>
                    <button onClick={() => handleRemove(a.id, a.program?.name)} className="text-xs font-medium text-alert-600 hover:text-alert-700">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Modal
            open={editOpen}
            onClose={() => setEditOpen(false)}
            title="Edit facilitator profile"
            footer={<><Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></>}
          >
            <form className="space-y-4" onSubmit={handleSave}>
              <Input label="Full name" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">Email address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-card border border-ink-300 px-3.5 py-2.5 text-sm text-ink-900 focus:border-signal-600 focus:ring-1 focus:ring-signal-600 outline-none transition-colors"
                />
                <p className="text-xs text-ink-400 mt-1">Changing this updates the facilitator's login email immediately.</p>
              </div>
              <Input label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              <Input label="Specialization" value={form.specialization} onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))} />
              <Input label="Facilitator code" value={form.facilitator_code} onChange={(e) => setForm((f) => ({ ...f, facilitator_code: e.target.value }))} />
              <Textarea label="Bio" rows={3} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
              <Select label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                {FACILITATOR_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
              <div className="pt-3 border-t border-ink-100">
                <Button type="button" variant="outline" size="sm" onClick={handleResetPassword} disabled={resettingPassword}>
                  <KeyRound size={14} /> {resettingPassword ? "Resetting..." : "Reset password"}
                </Button>
                <p className="text-xs text-ink-400 mt-1.5">Generates a new temporary password to share with the facilitator.</p>
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
              Share this temporary password with the facilitator securely. It won't be shown again.
            </p>
            <div className="rounded-card bg-ink-50 border border-ink-200 px-4 py-3 font-mono text-base text-ink-900 text-center select-all">
              {tempPasswordModal}
            </div>
          </Modal>

          <Modal
            open={assignOpen}
            onClose={() => setAssignOpen(false)}
            title="Assign program"
            footer={<><Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button><Button onClick={handleAssign} disabled={!selectedProgram}>Assign</Button></>}
          >
            <Select label="Program" value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)}>
              <option value="">Select a program</option>
              {unassignedPrograms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            {unassignedPrograms.length === 0 && <p className="text-xs text-ink-400 mt-2">Already assigned to every program.</p>}
          </Modal>
        </>
      )}
    </AdminLayout>
  );
}
