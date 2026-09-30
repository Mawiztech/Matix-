import { useState } from "react";
import { Link } from "react-router-dom";
import FacilitatorLayout from "./FacilitatorLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { useConfirm } from "../../context/ConfirmContext";
import { PageHeader, Card, StatusBadge, Select, Input, Textarea, Button, Modal } from "../../components/UI";
import { EmptyState, ErrorState, CardSkeleton } from "../../components/AsyncStates";
import { FileText, Plus, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { friendlyError } from "../../lib/friendlyError";

export default function FacAssignments() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [programFilter, setProgramFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", instructions: "", program_id: "", deadline: "", max_score: 100 });
  const [saving, setSaving] = useState(false);

  const { data: programs } = useSupabaseQuery(async () => {
    if (!user) return { data: null };
    const { data } = await supabase.from("facilitator_programs").select("program:programs(id, name)").eq("facilitator_id", user.id);
    return { data: (data || []).map((r) => r.program).filter(Boolean) };
  }, [user?.id]);

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    if (!user) return { data: null };
    let query = supabase
      .from("assignments")
      .select("id, title, deadline, status, max_score, program:programs(name)")
      .eq("facilitator_id", user.id)
      .order("created_at", { ascending: false });
    if (programFilter) query = query.eq("program_id", programFilter);
    const { data, error } = await query;
    return { data, error };
  }, [user?.id, programFilter]);

  const openNew = () => {
    setForm({ title: "", description: "", instructions: "", program_id: programs?.[0]?.id || "", deadline: "", max_score: 100 });
    setModalOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.program_id) {
      toast.error("Please provide a title and program.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("assignments").insert({
        title: form.title.trim(),
        description: form.description || null,
        instructions: form.instructions || null,
        program_id: form.program_id,
        facilitator_id: user.id,
        deadline: form.deadline || null,
        max_score: Number(form.max_score) || 100,
        status: "draft",
      });
      if (error) throw error;
      toast.success("Assignment created as draft");
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't create assignment."));
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (assignment) => {
    const publishing = assignment.status !== "published";
    const ok = await confirm({
      title: publishing ? "Publish assignment?" : "Unpublish assignment?",
      description: publishing ? "Students will be able to see and submit this assignment." : "Students will no longer see this assignment.",
      confirmLabel: publishing ? "Publish" : "Unpublish",
      danger: !publishing,
    });
    if (!ok) return;
    const { error } = await supabase.from("assignments").update({ status: publishing ? "published" : "draft" }).eq("id", assignment.id);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success(publishing ? "Assignment published" : "Assignment unpublished");
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
        title="Assignments"
        description="Create and manage assignments for your programs."
        action={<Button onClick={openNew}><Plus size={15} /> New assignment</Button>}
      />

      <div className="mb-5 max-w-xs">
        <Select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
          <option value="">All programs</option>
          {programs?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      {loading ? (
        <CardSkeleton count={3} />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState title="No assignments yet" description="Create your first assignment using the button above." icon={FileText} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-2">
                <Link to={`/facilitator/assignments/${a.id}`} className="font-medium text-ink-900 hover:underline line-clamp-2">{a.title}</Link>
                <StatusBadge status={a.status} />
              </div>
              <p className="text-xs text-ink-400 mt-1">{a.program?.name}</p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-ink-100">
                <span className="text-xs text-ink-400">{a.deadline ? `Due ${format(new Date(a.deadline), "MMM d, yyyy")}` : "No due date"}</span>
                <button onClick={() => togglePublish(a)} className="text-xs font-medium text-ink-600 hover:text-ink-900">
                  {a.status === "published" ? "Unpublish" : "Publish"}
                </button>
              </div>
              <Link to={`/facilitator/assignments/${a.id}`} className="flex items-center justify-end gap-1 text-xs text-ink-500 hover:text-ink-900 mt-2">
                View submissions <ArrowRight size={12} />
              </Link>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New assignment"
        size="lg"
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create as draft"}</Button></>}
      >
        <form className="space-y-4" onSubmit={handleCreate}>
          <Input label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Select label="Program" value={form.program_id} onChange={(e) => setForm((f) => ({ ...f, program_id: e.target.value }))}>
            <option value="">Select program</option>
            {programs?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Textarea label="Description" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <Textarea label="Instructions" rows={3} value={form.instructions} onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Deadline" type="datetime-local" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
            <Input label="Max score" type="number" value={form.max_score} onChange={(e) => setForm((f) => ({ ...f, max_score: e.target.value }))} />
          </div>
        </form>
      </Modal>
    </FacilitatorLayout>
  );
}
