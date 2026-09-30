import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, Input, Button, Modal, Select } from "../../components/UI";
import DataTable from "../../components/DataTable";
import { EmptyState, ErrorState } from "../../components/AsyncStates";
import { UserCog, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { friendlyError } from "../../lib/friendlyError";

export default function AdminFacilitators() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState("create"); // "create" | "promote"
  const [email, setEmail] = useState("");
  const [facilitatorCode, setFacilitatorCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from("facilitators")
      .select("id, facilitator_code, specialization, created_at, profile:profiles(full_name, email, status)")
      .order("created_at", { ascending: false });
    if (error) return { error };

    const ids = data.map((f) => f.id);
    let counts = {};
    if (ids.length) {
      const { data: fp } = await supabase.from("facilitator_programs").select("facilitator_id").in("facilitator_id", ids);
      counts = (fp || []).reduce((acc, r) => { acc[r.facilitator_id] = (acc[r.facilitator_id] || 0) + 1; return acc; }, {});
    }
    return { data: data.map((f) => ({ ...f, programCount: counts[f.id] || 0 })) };
  }, []);

  const resetForm = () => {
    setEmail("");
    setFacilitatorCode("");
    setFullName("");
    setPassword("");
    setSpecialization("");
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password || password.length < 8) {
      toast.error("Please fill in name, email, and a password of at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      // New facilitator accounts are created server-side via the admin-users
      // Edge Function (holds the service-role key), so the admin's own
      // browser session is never replaced by the new user's session.
      const { data: result, error: fnError } = await supabase.functions.invoke("admin-users", {
        body: {
          action: "create-user",
          role: "facilitator",
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          specialization: specialization.trim() || undefined,
        },
      });
      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);

      if (facilitatorCode.trim() && result?.userId) {
        await supabase.from("facilitators").update({ facilitator_code: facilitatorCode.trim() }).eq("id", result.userId);
      }

      toast.success("Facilitator account created");
      setModalOpen(false);
      resetForm();
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't create facilitator account."));
    } finally {
      setSaving(false);
    }
  };

  const handlePromote = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter the user's email address.");
      return;
    }
    setSaving(true);
    try {
      // Promotes an existing account (e.g. a student's) to facilitator via
      // the admin-only set_user_role RPC — no new auth user is created here,
      // so there's no session to hijack.
      const { data: existing, error: findErr } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("email", email.trim())
        .maybeSingle();

      if (findErr) throw findErr;
      if (!existing) {
        toast.error("No account found with that email.");
        setSaving(false);
        return;
      }
      if (existing.role === "facilitator") {
        toast.error("This user is already a facilitator.");
        setSaving(false);
        return;
      }

      const { error: rpcErr } = await supabase.rpc("set_user_role", {
        target_user_id: existing.id,
        new_role: "facilitator",
      });
      if (rpcErr) throw rpcErr;

      if (facilitatorCode.trim()) {
        await supabase.from("facilitators").update({ facilitator_code: facilitatorCode.trim() }).eq("id", existing.id);
      }

      toast.success("User promoted to facilitator");
      setModalOpen(false);
      resetForm();
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't promote this user."));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (e) => (mode === "create" ? handleCreate(e) : handlePromote(e));

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
        title="Facilitators"
        description="Manage facilitator accounts and program assignments."
        action={<Button onClick={() => { setMode("create"); setModalOpen(true); }}><Plus size={15} /> Add facilitator</Button>}
      />

      <Card>
        {!loading && (!data || data.length === 0) ? (
          <EmptyState title="No facilitators yet" description="Add a facilitator account using the button above." icon={UserCog} />
        ) : (
          <DataTable
            loading={loading}
            rows={data || []}
            columns={[
              { key: "name", header: "Name", render: (r) => (
                <button onClick={() => navigate(`/admin/facilitators/${r.id}`)} className="font-medium text-ink-900 hover:underline">{r.profile?.full_name}</button>
              ) },
              { key: "email", header: "Email", render: (r) => r.profile?.email },
              { key: "facilitator_code", header: "Code", render: (r) => r.facilitator_code || "—" },
              { key: "specialization", header: "Specialization", render: (r) => r.specialization || "—" },
              { key: "programs", header: "Programs", render: (r) => r.programCount },
            ]}
          />
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={mode === "create" ? "Add facilitator" : "Promote existing user"}
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit} disabled={saving}>{saving ? "Saving..." : mode === "create" ? "Create account" : "Promote"}</Button></>}
      >
        <div className="flex gap-1.5 mb-4 p-1 bg-ink-50 rounded-card w-fit">
          <button type="button" onClick={() => setMode("create")} className={`px-3 py-1.5 text-xs font-medium rounded-card transition-colors ${mode === "create" ? "bg-white shadow-card text-ink-900" : "text-ink-500"}`}>
            New account
          </button>
          <button type="button" onClick={() => setMode("promote")} className={`px-3 py-1.5 text-xs font-medium rounded-card transition-colors ${mode === "promote" ? "bg-white shadow-card text-ink-900" : "text-ink-500"}`}>
            Promote existing user
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode === "create" ? (
            <>
              <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <Input label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="person@example.com" />
              <Input label="Temporary password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
              <Input label="Specialization (optional)" value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
              <Input label="Facilitator code (optional)" value={facilitatorCode} onChange={(e) => setFacilitatorCode(e.target.value)} />
            </>
          ) : (
            <>
              <p className="text-xs text-ink-500 bg-ink-50 rounded-card p-3">
                The person must already have an account. Enter their email to promote their existing account to the facilitator role.
              </p>
              <Input label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="person@example.com" />
              <Input label="Facilitator code (optional)" value={facilitatorCode} onChange={(e) => setFacilitatorCode(e.target.value)} />
            </>
          )}
        </form>
      </Modal>
    </AdminLayout>
  );
}
