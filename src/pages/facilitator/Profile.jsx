import { useEffect, useState } from "react";
import FacilitatorLayout from "./FacilitatorLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, Input, Textarea, Button } from "../../components/UI";
import { ErrorState, CardSkeleton } from "../../components/AsyncStates";
import { friendlyError } from "../../lib/friendlyError";
import toast from "react-hot-toast";

export default function FacProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", bio: "", specialization: "" });

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    if (!user) return { data: null };
    const [facRes, programsRes] = await Promise.all([
      supabase.from("facilitators").select("facilitator_code, bio, specialization").eq("id", user.id).maybeSingle(),
      supabase.from("facilitator_programs").select("program:programs(name)").eq("facilitator_id", user.id),
    ]);
    if (facRes.error) return { error: facRes.error };
    return { data: { facilitator: facRes.data, programs: (programsRes.data || []).map((r) => r.program?.name).filter(Boolean) } };
  }, [user?.id]);

  useEffect(() => {
    if (profile || data?.facilitator) {
      setForm({
        full_name: profile?.full_name || "",
        phone: profile?.phone || "",
        bio: data?.facilitator?.bio || "",
        specialization: data?.facilitator?.specialization || "",
      });
    }
  }, [profile, data]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const [profileRes, facRes] = await Promise.all([
        supabase.from("profiles").update({ full_name: form.full_name, phone: form.phone }).eq("id", user.id),
        supabase.from("facilitators").update({ bio: form.bio || null, specialization: form.specialization || null }).eq("id", user.id),
      ]);
      if (profileRes.error) throw profileRes.error;
      if (facRes.error) throw facRes.error;
      toast.success("Profile updated");
      await refreshProfile();
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't update profile."));
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
      <PageHeader title="Profile" description="Manage your facilitator profile." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-1" title="Account">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-ink-400">Email</span><span className="text-ink-800">{profile?.email}</span></div>
            <div className="flex justify-between"><span className="text-ink-400">Facilitator code</span><span className="text-ink-800 font-medium">{loading ? "—" : data?.facilitator?.facilitator_code || "—"}</span></div>
            <div className="flex justify-between"><span className="text-ink-400">Role</span><span className="text-ink-800 capitalize">{profile?.role}</span></div>
          </div>
          <div className="mt-4 pt-4 border-t border-ink-100">
            <p className="text-xs text-ink-500 mb-2">Assigned programs</p>
            <div className="flex flex-wrap gap-1.5">
              {loading ? "—" : data?.programs.length === 0 ? <span className="text-xs text-ink-400">None assigned</span> :
                data.programs.map((p, i) => (
                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-block text-xs font-medium bg-good-100 text-good-700">
                    {p}
                  </span>
                ))}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2" title="Profile Details">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Full name" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} disabled={loading} />
              <Input label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} disabled={loading} />
            </div>
            <Input label="Specialization" value={form.specialization} onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))} disabled={loading} />
            <Textarea label="Bio" rows={4} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} disabled={loading} />
            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={saving || loading}>{saving ? "Saving..." : "Save changes"}</Button>
            </div>
          </form>
        </Card>
      </div>
    </FacilitatorLayout>
  );
}
