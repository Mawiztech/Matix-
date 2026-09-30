import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useSupabaseQuery } from "../hooks/useSupabaseQuery";
import { EmptyState, ErrorState } from "./AsyncStates";
import { Modal, Input, Button } from "./UI";
import { Search, Send, Plus, MessageSquare } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import toast from "react-hot-toast";
import { friendlyError } from "../lib/friendlyError";

export default function Chat() {
  const { user, profile } = useAuth();
  const [activeId, setActiveId] = useState(null);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const { data: conversations, loading: convLoading, error: convError, refetch: refetchConvs } = useSupabaseQuery(async () => {
    if (!user) return { data: null };
    const { data, error } = await supabase
      .from("conversation_participants")
      .select(
        "conversation_id, last_read_at, conversation:conversations(id, is_group, title, created_at, updated_at, participants:conversation_participants(user_id, profile:profiles(id, full_name, role)))"
      )
      .eq("user_id", user.id)
      .order("conversation(updated_at)", { ascending: false });
    return { data, error };
  }, [user?.id]);

  const { data: people } = useSupabaseQuery(async () => {
    if (!user) return { data: null };
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .neq("id", user.id)
      .order("full_name");
    return { data, error };
  }, [user?.id]);

  const conversationList = useMemo(() => {
    if (!conversations) return [];
    return conversations
      .map((cp) => cp.conversation)
      .filter(Boolean)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  }, [conversations]);

  const activeConversation = conversationList.find((c) => c.id === activeId);

  const otherParticipant = (conv) =>
    conv?.participants?.find((p) => p.user_id !== user.id)?.profile;

  const conversationLabel = (conv) => {
    if (conv.is_group) return conv.title || "Group chat";
    const other = otherParticipant(conv);
    return other?.full_name || "Conversation";
  };

  // Load messages for active conversation + subscribe to realtime updates
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    let channel;
    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, body, sender_id, created_at, sender:profiles(full_name)")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true });
      if (!error) setMessages(data || []);

      await supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", activeId)
        .eq("user_id", user.id);

      channel = supabase
        .channel(`messages:${activeId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` },
          (payload) => {
            setMessages((prev) => [...prev, payload.new]);
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [activeId, user?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeId) return;
    setSending(true);
    const body = messageText.trim();
    setMessageText("");
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: activeId,
        sender_id: user.id,
        body,
      });
      if (error) throw error;
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", activeId);
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't send your message."));
      setMessageText(body);
    } finally {
      setSending(false);
    }
  };

  const startConversation = async (otherUserId) => {
    // Reuse an existing 1:1 conversation if one already exists with this person.
    const existing = conversationList.find(
      (c) => !c.is_group && c.participants?.some((p) => p.user_id === otherUserId)
    );
    if (existing) {
      setActiveId(existing.id);
      setNewModalOpen(false);
      return;
    }

    try {
      const { data: conv, error: convErr } = await supabase
        .from("conversations")
        .insert({ created_by: user.id, is_group: false })
        .select("id")
        .single();
      if (convErr) throw convErr;
      if (!conv) throw new Error("Could not create the conversation.");

      const { error: partErr } = await supabase.from("conversation_participants").insert([
        { conversation_id: conv.id, user_id: user.id },
        { conversation_id: conv.id, user_id: otherUserId },
      ]);
      if (partErr) throw partErr;

      setNewModalOpen(false);
      setActiveId(conv.id);
      refetchConvs();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't start a conversation."));
    }
  };

  const filteredPeople = (people || []).filter((p) =>
    p.full_name?.toLowerCase().includes(peopleSearch.toLowerCase())
  );

  if (convError) {
    return <ErrorState onRetry={refetchConvs} />;
  }

  return (
    <div className="bg-white rounded-card border border-ink-200 overflow-hidden" style={{ height: "calc(100vh - 160px)", minHeight: 480 }}>
      <div className="flex h-full">
        {/* Conversation list */}
        <div className={`w-full sm:w-72 border-r border-ink-200 flex flex-col ${activeId ? "hidden sm:flex" : "flex"}`}>
          <div className="p-3.5 border-b border-ink-200 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-ink-900">Messages</h3>
            <button onClick={() => setNewModalOpen(true)} className="h-7 w-7 rounded-block bg-signal-600 text-white flex items-center justify-center hover:bg-signal-700 transition-colors">
              <Plus size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convLoading ? (
              <div className="p-4 space-y-3 animate-pulse">
                {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-ink-100 rounded-card" />)}
              </div>
            ) : conversationList.length === 0 ? (
              <EmptyState title="No conversations yet" description="Start a new conversation using the + button." icon={MessageSquare} />
            ) : (
              conversationList.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveId(conv.id)}
                  className={`w-full text-left px-3.5 py-3 border-b border-ink-100 hover:bg-signal-50 transition-colors ${activeId === conv.id ? "bg-signal-50" : ""}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-block bg-ink-900 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                      {conversationLabel(conv).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink-900 truncate">{conversationLabel(conv)}</p>
                      <p className="text-xs text-ink-400 truncate capitalize font-mono">
                        {conv.is_group ? "Group" : otherParticipant(conv)?.role}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Active conversation */}
        <div className={`flex-1 flex flex-col ${activeId ? "flex" : "hidden sm:flex"}`}>
          {!activeConversation ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState title="Select a conversation" description="Choose a conversation from the list, or start a new one." icon={MessageSquare} />
            </div>
          ) : (
            <>
              <div className="p-3.5 border-b border-ink-200 flex items-center gap-2.5">
                <button onClick={() => setActiveId(null)} className="sm:hidden text-ink-500 text-sm mr-1">←</button>
                <div className="h-8 w-8 rounded-block bg-ink-900 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                  {conversationLabel(activeConversation).slice(0, 2).toUpperCase()}
                </div>
                <p className="text-sm font-medium text-ink-900">{conversationLabel(activeConversation)}</p>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <EmptyState title="No messages yet" description="Say hello!" icon={MessageSquare} />
                ) : (
                  messages.map((m) => {
                    const isMine = m.sender_id === user.id;
                    return (
                      <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 bubble-in ${isMine ? "bg-gradient-to-br from-signal-500 to-signal-700 text-white shadow-[0_8px_20px_-8px_rgba(11,37,69,0.6)]" : "bg-ink-100 text-ink-800"}`}>
                          <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                          <p className={`text-[10px] mt-1 ${isMine ? "text-signal-100" : "text-ink-400"}`}>
                            {m.created_at && formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleSend} className="p-3 border-t border-ink-200 flex items-center gap-2">
                <input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-card border border-ink-300 px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-signal-600 focus:ring-1 focus:ring-signal-600 outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={sending || !messageText.trim()}
                  className="h-10 w-10 shrink-0 rounded-card bg-signal-600 text-white flex items-center justify-center hover:bg-signal-700 disabled:opacity-50 transition-colors btn-lift"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <Modal open={newModalOpen} onClose={() => setNewModalOpen(false)} title="New conversation">
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <Input placeholder="Search people..." value={peopleSearch} onChange={(e) => setPeopleSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="max-h-80 overflow-y-auto -mx-1">
          {filteredPeople.length === 0 ? (
            <p className="text-sm text-ink-400 text-center py-6">No one found.</p>
          ) : (
            filteredPeople.map((p) => (
              <button
                key={p.id}
                onClick={() => startConversation(p.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-card hover:bg-signal-50 transition-colors text-left"
              >
                <div className="h-8 w-8 rounded-block bg-ink-900 text-white flex items-center justify-center text-xs font-semibold shrink-0">
                  {p.full_name?.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900 truncate">{p.full_name}</p>
                  <p className="text-xs text-ink-400 capitalize font-mono">{p.role}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
