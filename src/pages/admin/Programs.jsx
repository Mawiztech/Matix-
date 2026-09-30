import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { useConfirm } from "../../context/ConfirmContext";
import { PageHeader, Card, StatusBadge, Input, Textarea, Select, Button, Modal } from "../../components/UI";
import { EmptyState, ErrorState, CardSkeleton } from "../../components/AsyncStates";
import { BookOpen, Plus, Users } from "lucide-react";
import toast from "react-hot-toast";
import { friendlyError } from "../../lib/friendlyError";

export default function AdminPrograms() {
  const confirm = useConfirm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [assignOpen, setAssignOpen] = useState(null); // program being assigned
  const [selectedFacilitator, setSelectedFacilitator] = useState("");
  const [form, setForm] = useState({ name: "", program_code: "", description: "", duration_weeks: "", price: "" });
  const [saving, setSaving] = useState(false);

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    const { data, error } = await supabase.from("programs").select("id, name, program_code, description, duration_weeks, price, status").order("created_at", { ascending: false });
    if (error) return { error };
    const ids = data.map((p) => p.id);
    let enrollCounts = {};
    let facMap = {};
    if (ids.length) {
      const [{ data: enr }, { data: fp }] = await Promise.all([
        supabase.from("enrollments").select("program_id").in("program_id", ids),
        supabase.from("facilitator_programs").select("program_id, facilitator:facilitators(id, profile:profiles(full_name))").in("program_id", ids),
      ]);
      enrollCounts = (enr || []).reduce((acc, e) => { acc[e.program_id] = (acc[e.program_id] || 0) + 1; return acc; }, {});
      facMap = (fp || []).reduce((acc, r) => { (acc[r.program_id] ||= []).push(r.facilitator); return acc; }, {});
    }
    return { data: data.map((p) => ({ ...p, enrollCount: enrollCounts[p.id] || 0, facilitators: facMap[p.id] || [] })) };
  }, []);

  const { data: allFacilitators } = useSupabaseQuery(async () => {
    const { data } = await supabase.from("facilitators").select("id, profile:profiles(full_name)");
    return { data: data || [] };
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", program_code: "", description: "", duration_weeks: "", price: "" });
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, program_code: p.program_code || "", description: p.description || "", duration_weeks: p.duration_weeks || "", price: p.price || "" });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Please enter a program name.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        program_code: form.program_code.trim() || null,
        description: form.description || null,
        duration_weeks: form.duration_weeks ? Number(form.duration_weeks) : null,
        price: form.price ? Number(form.price) : null,
      };
      if (editing) {
        const { error } = await supabase.from("programs").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Program updated");
      } else {
        const { error } = await supabase.from("programs").insert({ ...payload, status: "active" });
        if (error) throw error;
        toast.success("Program created");
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't save program."));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (p) => {
    const activating = p.status !== "active";
    const ok = await confirm({
      title: activating ? "Activate program?" : "Deactivate program?",
      description: activating ? "Students will be able to enroll and interact with this program." : "This program will be hidden from new enrollment.",
      confirmLabel: activating ? "Activate" : "Deactivate",
      danger: !activating,
    });
    if (!ok) return;
    const { error } = await supabase.from("programs").update({ status: activating ? "active" : "inactive" }).eq("id", p.id);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success(activating ? "Program activated" : "Program deactivated");
    refetch();
  };

  const handleAssignFacilitator = async () => {
    if (!selectedFacilitator) return;
    try {
      const { error } = await supabase.from("facilitator_programs").insert({ facilitator_id: selectedFacilitator, program_id: assignOpen.id });
      if (error) throw error;
      toast.success("Facilitator assigned");
      setSelectedFacilitator("");
      setAssignOpen(null);
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't assign facilitator."));
    }
  };

  const handleRemoveFacilitator = async (programId, facilitatorId) => {
    const ok = await confirm({ title: "Remove facilitator?", description: "They will lose access to manage this program.", confirmLabel: "Remove" });
    if (!ok) return;
    const { error } = await supabase.from("facilitator_programs").delete().eq("program_id", programId).eq("facilitator_id", facilitatorId);
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    toast.success("Facilitator removed");
    refetch();
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
      <PageHeader title="Programs" description="Manage training programs." action={<Button onClick={openNew}><Plus size={15} /> New program</Button>} />

      {loading ? (
        <CardSkeleton count={3} />
      ) : !data || data.length === 0 ? (
        <Card><EmptyState title="No programs yet" icon={BookOpen} /></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-ink-900">{p.name}</p>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-xs text-ink-400 mt-0.5">{p.program_code}</p>
              {p.description && <p className="text-sm text-ink-500 mt-2 line-clamp-2">{p.description}</p>}

              <div className="flex items-center gap-1.5 text-sm text-ink-600 mt-3">
                <Users size={13} className="text-ink-400" /> {p.enrollCount} enrolled
              </div>

              <div className="mt-3 pt-3 border-t border-ink-100">
                <p className="text-xs text-ink-400 mb-1.5">Facilitators</p>
                {p.facilitators.length === 0 ? (
                  <p className="text-xs text-ink-300">None assigned</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {p.facilitators.map((f) => (
                      <span key={f.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-block text-xs bg-ink-100 text-ink-700">
                        {f.profile?.full_name}
                        <button onClick={() => handleRemoveFacilitator(p.id, f.id)} className="text-ink-400 hover:text-alert-600">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <button onClick={() => setAssignOpen(p)} className="text-xs font-medium text-ink-600 hover:text-ink-900 mt-2">+ Assign facilitator</button>
              </div>

              <div className="flex justify-between mt-4 pt-4 border-t border-ink-100">
                <button onClick={() => openEdit(p)} className="text-xs font-medium text-ink-600 hover:text-ink-900">Edit</button>
                <button onClick={() => toggleStatus(p)} className="text-xs font-medium text-ink-600 hover:text-ink-900">{p.status === "active" ? "Deactivate" : "Activate"}</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit program" : "New program"} size="lg"
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></>}>
        <form className="space-y-4" onSubmit={handleSave}>
          <Input label="Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input label="Program code" value={form.program_code} onChange={(e) => setForm((f) => ({ ...f, program_code: e.target.value }))} />
          <Textarea label="Description" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Duration (weeks)" type="number" value={form.duration_weeks} onChange={(e) => setForm((f) => ({ ...f, duration_weeks: e.target.value }))} />
            <Input label="Price" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
          </div>
        </form>
      </Modal>

      <Modal open={!!assignOpen} onClose={() => setAssignOpen(null)} title={`Assign facilitator to ${assignOpen?.name || ""}`}
        footer={<><Button variant="outline" onClick={() => setAssignOpen(null)}>Cancel</Button><Button onClick={handleAssignFacilitator} disabled={!selectedFacilitator}>Assign</Button></>}>
        <Select label="Facilitator" value={selectedFacilitator} onChange={(e) => setSelectedFacilitator(e.target.value)}>
          <option value="">Select facilitator</option>
          {allFacilitators?.filter((f) => !assignOpen?.facilitators.some((af) => af.id === f.id)).map((f) => (
            <option key={f.id} value={f.id}>{f.profile?.full_name}</option>
          ))}
        </Select>
      </Modal>
    </AdminLayout>
  );
}
