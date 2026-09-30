import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, Input, Button } from "../../components/UI";
import { CardSkeleton, EmptyState } from "../../components/AsyncStates";
import { friendlyError } from "../../lib/friendlyError";
import toast from "react-hot-toast";
import { Eye, EyeOff, Award } from "lucide-react";

export default function AdminSettings() {
  const { profile } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: gradeScale, loading } = useSupabaseQuery(async () => {
    const { data, error } = await supabase.from("grade_scale").select("*").order("min_score", { ascending: false });
    return { data, error };
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) {
      toast.error(friendlyError(error, "Couldn't update your password."));
      return;
    }
    toast.success("Password updated");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <AdminLayout>
      <PageHeader title="Settings" description="Account security and grading reference." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Change Password">
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="relative">
              <Input label="New password" type={show ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-[34px] text-ink-400 hover:text-ink-600">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Input label="Confirm new password" type={show ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving}>{saving ? "Updating..." : "Update password"}</Button>
            </div>
          </form>
          <div className="mt-4 pt-4 border-t border-ink-100 text-sm space-y-2">
            <div className="flex justify-between"><span className="text-ink-400">Email</span><span className="text-ink-800">{profile?.email}</span></div>
            <div className="flex justify-between"><span className="text-ink-400">Role</span><span className="text-ink-800 capitalize">{profile?.role}</span></div>
          </div>
        </Card>

        <Card title="Grade Scale">
          {loading ? (
            <CardSkeleton count={1} />
          ) : !gradeScale || gradeScale.length === 0 ? (
            <EmptyState title="No grade scale configured" description="Grade bands will appear here once set up in the database." icon={Award} />
          ) : (
            <div className="space-y-2">
              {gradeScale.map((g) => (
                <div key={g.id} className="flex items-center justify-between text-sm py-1.5 border-b border-ink-50 last:border-0">
                  <span className="text-ink-800 font-medium">{g.letter_grade}</span>
                  <span className="text-ink-500">{g.min_score}–{g.max_score}%</span>
                  {g.gpa != null && <span className="text-ink-400">GPA {g.gpa}</span>}
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-ink-400 mt-4 pt-4 border-t border-ink-100">
            Grading weights and scales are configured at the database level and shown here for reference.
          </p>
        </Card>
      </div>
    </AdminLayout>
  );
}
