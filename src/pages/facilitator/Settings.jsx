import { useState } from "react";
import FacilitatorLayout from "./FacilitatorLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { PageHeader, Card, Input, Button } from "../../components/UI";
import { friendlyError } from "../../lib/friendlyError";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

export default function FacSettings() {
  const { profile } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

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
    <FacilitatorLayout>
      <PageHeader title="Settings" description="Manage your account security." />

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
        </Card>

        <Card title="Account">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-ink-400">Email</span><span className="text-ink-800">{profile?.email}</span></div>
            <div className="flex justify-between"><span className="text-ink-400">Role</span><span className="text-ink-800 capitalize">{profile?.role}</span></div>
            <div className="flex justify-between"><span className="text-ink-400">Account status</span><span className="text-ink-800 capitalize">{profile?.status}</span></div>
          </div>
          <p className="text-xs text-ink-400 mt-4 pt-4 border-t border-ink-100">
            Your role cannot be changed here — contact an administrator if this needs to change.
          </p>
        </Card>
      </div>
    </FacilitatorLayout>
  );
}
