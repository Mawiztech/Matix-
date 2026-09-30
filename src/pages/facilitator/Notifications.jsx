import FacilitatorLayout from "./FacilitatorLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, Button } from "../../components/UI";
import { CardSkeleton, EmptyState, ErrorState } from "../../components/AsyncStates";
import { Bell } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function FacNotifications() {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    if (!user) return { data: null };
    const { data, error } = await supabase
      .from("notification_recipients")
      .select("id, is_read, created_at, notifications(id, title, body, created_at, sender:profiles(full_name))")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false });
    return { data, error };
  }, [user?.id]);

  const unreadCount = (data || []).filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    const unread = (data || []).filter((n) => !n.is_read);
    if (unread.length === 0) return;
    const { error } = await supabase.from("notification_recipients").update({ is_read: true, read_at: new Date().toISOString() }).in("id", unread.map((n) => n.id));
    if (error) {
      toast.error("Couldn't mark notifications as read.");
      return;
    }
    toast.success("All notifications marked as read");
    refetch();
  };

  const markRead = async (id) => {
    await supabase.from("notification_recipients").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", id);
    refetch();
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
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
        action={unreadCount > 0 && <Button variant="outline" size="sm" onClick={markAllRead}>Mark all as read</Button>}
      />

      {loading ? (
        <CardSkeleton count={3} />
      ) : !data || data.length === 0 ? (
        <Card><EmptyState title="No notifications" icon={Bell} /></Card>
      ) : (
        <Card className="!p-0">
          <div className="divide-y divide-ink-50">
            {data.map((n) => (
              <button key={n.id} onClick={() => !n.is_read && markRead(n.id)} className={`w-full text-left px-5 py-4 hover:bg-ink-50/60 transition-colors ${!n.is_read ? "bg-warn-50/40" : ""}`}>
                <div className="flex items-start gap-3">
                  {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-warn-500 mt-2 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-ink-900">{n.notifications?.title}</p>
                      <span className="text-xs text-ink-400 shrink-0">{n.notifications?.created_at && format(new Date(n.notifications.created_at), "MMM d, yyyy")}</span>
                    </div>
                    <p className="text-sm text-ink-500 mt-1">{n.notifications?.body}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </FacilitatorLayout>
  );
}
