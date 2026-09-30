import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, Select, Input, Textarea, Button, Modal } from "../../components/UI";
import { EmptyState, ErrorState, CardSkeleton } from "../../components/AsyncStates";
import { Bell, Plus } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { friendlyError } from "../../lib/friendlyError";

export default function AdminNotifications() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", audience: "all_students" });
  const [saving, setSaving] = useState(false);

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, body, created_at, sender:profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(50);
    return { data, error };
  }, []);

  const openNew = () => {
    setForm({ title: "", body: "", audience: "all_students" });
    setModalOpen(true);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Please provide a title and message.");
      return;
    }
    setSaving(true);
    try {
      const audienceTypeMap = {
        all_students: "multiple",
        all_facilitators: "facilitators",
        everyone: "everyone",
      };

      const { data: notif, error: notifErr } = await supabase
        .from("notifications")
        .insert({
          title: form.title.trim(),
          body: form.body.trim(),
          sender_id: user.id,
          audience_type: audienceTypeMap[form.audience] || "multiple",
        })
        .select("id")
        .single();
      if (notifErr) throw notifErr;

      let recipientQuery;
      if (form.audience === "all_students") {
        recipientQuery = supabase.from("profiles").select("id").eq("role", "student");
      } else if (form.audience === "all_facilitators") {
        recipientQuery = supabase.from("profiles").select("id").eq("role", "facilitator");
      } else {
        recipientQuery = supabase.from("profiles").select("id").in("role", ["student", "facilitator"]);
      }
      const { data: recipients, error: recErr } = await recipientQuery;
      if (recErr) throw recErr;

      if (recipients.length > 0) {
        const rows = recipients.map((r) => ({ notification_id: notif.id, recipient_id: r.id, is_read: false }));
        const { error: insErr } = await supabase.from("notification_recipients").insert(rows);
        if (insErr) throw insErr;
      }

      toast.success(`Notification sent to ${recipients.length} recipient(s)`);
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't send notification."));
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
        title="Notifications"
        description="Send announcements and view notification history."
        action={<Button onClick={openNew}><Plus size={15} /> New notification</Button>}
      />

      {loading ? (
        <CardSkeleton count={4} />
      ) : !data || data.length === 0 ? (
        <Card><EmptyState title="No notifications sent yet" icon={Bell} /></Card>
      ) : (
        <Card className="!p-0">
          <div className="divide-y divide-ink-50">
            {data.map((n) => (
              <div key={n.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink-900">{n.title}</p>
                  <span className="text-xs text-ink-400 shrink-0">{n.created_at && format(new Date(n.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
                </div>
                <p className="text-sm text-ink-500 mt-1">{n.body}</p>
                {n.sender?.full_name && <p className="text-xs text-ink-400 mt-1.5">Sent by {n.sender.full_name}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New notification"
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSend} disabled={saving}>{saving ? "Sending..." : "Send"}</Button></>}>
        <form className="space-y-4" onSubmit={handleSend}>
          <Input label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Textarea label="Message" rows={4} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
          <Select label="Send to" value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}>
            <option value="all_students">All students</option>
            <option value="all_facilitators">All facilitators</option>
            <option value="everyone">Everyone (students & facilitators)</option>
          </Select>
        </form>
      </Modal>
    </AdminLayout>
  );
}
