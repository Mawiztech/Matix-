import { useEffect, useState } from "react";
import StudentLayout from "./StudentLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, Input, Select, Button, StatusBadge } from "../../components/UI";
import { ErrorState } from "../../components/AsyncStates";
import { friendlyError } from "../../lib/friendlyError";
import toast from "react-hot-toast";

export default function StudentProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", gender: "", date_of_birth: "", address: "", emergency_contact: "" });

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    if (!user) return { data: null };
    const { data, error } = await supabase
      .from("students")
      .select("student_code, gender, date_of_birth, address, emergency_contact, status, created_at")
      .eq("id", user.id)
      .maybeSingle();
    return { data, error };
  }, [user?.id]);

  useEffect(() => {
    if (profile || data) {
      setForm({
        full_name: profile?.full_name || "",
        phone: profile?.phone || "",
        gender: data?.gender || "",
        date_of_birth: data?.date_of_birth || "",
        address: data?.address || "",
        emergency_contact: data?.emergency_contact || "",
      });
    }
  }, [profile, data]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const [profileRes, studentRes] = await Promise.all([
        supabase.from("profiles").update({ full_name: form.full_name, phone: form.phone }).eq("id", user.id),
        supabase
          .from("students")
          .update({
            gender: form.gender || null,
            date_of_birth: form.date_of_birth || null,
            address: form.address || null,
            emergency_contact: form.emergency_contact || null,
          })
          .eq("id", user.id),
      ]);
      if (profileRes.error) throw profileRes.error;
      if (studentRes.error) throw studentRes.error;
      toast.success("Profile updated");
      await refreshProfile();
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't update your profile."));
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <StudentLayout>
        <ErrorState onRetry={refetch} />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <PageHeader title="Profile" description="Manage your personal information." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-1" title="Account">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-400">Email</span>
              <span className="text-ink-800">{profile?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-400">Student code</span>
              <span className="text-ink-800 font-medium">{loading ? "—" : data?.student_code || "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-ink-400">Status</span>
              {loading ? "—" : <StatusBadge status={data?.status} />}
            </div>
            <div className="flex justify-between">
              <span className="text-ink-400">Role</span>
              <span className="text-ink-800 capitalize">{profile?.role}</span>
            </div>
          </div>
          <p className="text-xs text-ink-400 mt-4 pt-4 border-t border-ink-100">
            Your role and account status can only be changed by an administrator.
          </p>
        </Card>

        <Card className="lg:col-span-2" title="Personal Information">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full name"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                disabled={loading}
              />
              <Input
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                disabled={loading}
              />
              <Select
                label="Gender"
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                disabled={loading}
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Select>
              <Input
                label="Date of birth"
                type="date"
                value={form.date_of_birth || ""}
                onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))}
                disabled={loading}
              />
            </div>
            <Input
              label="Address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              disabled={loading}
            />
            <Input
              label="Emergency contact"
              value={form.emergency_contact}
              onChange={(e) => setForm((f) => ({ ...f, emergency_contact: e.target.value }))}
              disabled={loading}
            />
            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={saving || loading}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </StudentLayout>
  );
}
