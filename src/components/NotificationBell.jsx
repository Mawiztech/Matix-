import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { EmptyState } from "./AsyncStates";

export default function NotificationBell() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef(null);

  const settingsPath = profile?.role ? `/${profile.role}/notifications` : "#";

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notification_recipients")
      .select("id, is_read, created_at, notifications(id, title, body, created_at)")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8);
    if (!error) setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = items.filter((i) => !i.is_read).length;

  const markRead = async (id) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_read: true } : i)));
    await supabase.from("notification_recipients").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", id);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative h-9 w-9 rounded-full flex items-center justify-center text-ink-600 hover:bg-ink-50 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-alert-600 text-white text-[10px] font-semibold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="fixed left-3 right-3 top-[68px] sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 bg-white rounded-card shadow-pop border border-ink-100 z-50 overflow-hidden modal-in origin-top sm:origin-top-right">
          <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
            <p className="font-display text-sm font-semibold text-ink-900">Notifications</p>
            {unreadCount > 0 && <span className="text-xs text-ink-400">{unreadCount} unread</span>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-ink-50 rounded" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState title="No notifications" description="You're all caught up." />
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => markRead(item.id)}
                  className={`w-full text-left px-4 py-3 border-b border-ink-50 last:border-0 hover:bg-ink-50 transition-colors ${
                    !item.is_read ? "bg-warn-50/50" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!item.is_read && <span className="h-1.5 w-1.5 rounded-full bg-warn-500 mt-1.5 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900 truncate">
                        {item.notifications?.title}
                      </p>
                      <p className="text-xs text-ink-500 line-clamp-2 mt-0.5">
                        {item.notifications?.body}
                      </p>
                      <p className="text-[11px] text-ink-400 mt-1">
                        {item.notifications?.created_at &&
                          formatDistanceToNow(new Date(item.notifications.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <Link
            to={settingsPath}
            onClick={() => setOpen(false)}
            className="block text-center text-xs font-medium text-ink-600 py-2.5 hover:bg-ink-50 transition-colors"
          >
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
