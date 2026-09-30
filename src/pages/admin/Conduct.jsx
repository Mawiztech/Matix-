import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, StatusBadge, Select, Input, Textarea, Button, Modal } from "../../components/UI";
import { EmptyState, ErrorState, CardSkeleton } from "../../components/AsyncStates";
import { ShieldAlert, Plus, Search } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { friendlyError } from "../../lib/friendlyError";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

export default function AdminConduct() {
  const [searchParams] = useSearchParams();
  const studentIdParam = searchParams.get("student") || "";
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [severityFilter, setSeverityFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ student_id: "", program_id: "", category: "", description: "", severity: "note", occurred_at: "" });
  const [saving, setSaving] = useState(false);

  const { data: meta } = useSupabaseQuery(async () => {
    const [{ data: students }, { data: programs }] = await Promise.all([
      supabase.from("students").select("id, profile:profiles(full_name)"),
      supabase.from("programs").select("id, name"),
    ]);
    return { data: { students: students || [], programs: programs || [] } };
  }, []);

  // Arriving from a student's detail page with ?student=<id> pre-fills the
  // search box with that student's name so the list is filtered to them.
  useEffect(() => {
    if (!studentIdParam || !meta?.students?.length) return;
    const match = meta.students.find((s) => s.id === studentIdParam);
    if (match?.profile?.full_name) setSearch(match.profile.full_name);
  }, [studentIdParam, meta]);

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    let query = supabase
      .from("professional_conduct")
      .select("id, category, description, severity, occurred_at, student_id, program_id, student:students(profile:profiles(full_name)), program:programs(name)")
      .order("occurred_at", { ascending: false });
    if (severityFilter) query = query.eq("severity", severityFilter);
    const { data, error } = await query;
    return { data, error };
  }, [severityFilter]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!debouncedSearch) return data;
    const q = debouncedSearch.toLowerCase();
    return data.filter((r) => r.student?.profile?.full_name?.toLowerCase().includes(q));
  }, [data, debouncedSearch]);

  const openNew = () => {
    setEditing(null);
    setForm({ student_id: studentIdParam || "", program_id: "", category: "", description: "", severity: "note", occurred_at: format(new Date(), "yyyy-MM-dd") });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({ student_id: row.student_id, program_id: row.program_id || "", category: row.category || "", description: row.description || "", severity: row.severity, occurred_at: row.occurred_at });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.student_id || !form.occurred_at) {
      toast.error("Please select a student and date.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("professional_conduct").update({
          category: form.category || null, description: form.description || null, severity: form.severity, occurred_at: form.occurred_at, program_id: form.program_id || null,
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Record updated");
      } else {
        const { error } = await supabase.from("professional_conduct").insert({
          student_id: form.student_id, program_id: form.program_id || null, category: form.category || null,
          description: form.description || null, severity: form.severity, occurred_at: form.occurred_at,
        });
        if (error) throw error;
        toast.success("Conduct record added");
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't save record."));
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
        title="Professional Conduct"
        description="View and manage conduct evaluations across all students."
        action={<Button onClick={openNew}><Plus size={15} /> Add record</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <Input placeholder="Search by student name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
          <option value="">All severities</option>
          <option value="note">Note</option>
          <option value="minor">Minor</option>
          <option value="major">Major</option>
          <option value="critical">Critical</option>
        </Select>
      </div>

      {loading ? (
        <CardSkeleton count={3} />
      ) : filtered.length === 0 ? (
        <Card><EmptyState title="No conduct records found" icon={ShieldAlert} /></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <Card key={r.id} className="!p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink-900">{r.student?.profile?.full_name}</p>
                    <StatusBadge status={r.severity} />
                  </div>
                  <p className="text-xs text-ink-400 mt-0.5">
                    {r.program?.name || "General"} · {r.category || "Uncategorized"} · {format(new Date(r.occurred_at), "MMM d, yyyy")}
                  </p>
                  {r.description && <p className="text-sm text-ink-600 mt-2">{r.description}</p>}
                </div>
                <button onClick={() => openEdit(r)} className="text-xs font-medium text-ink-600 hover:text-ink-900 shrink-0">Edit</button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit record" : "Add conduct record"}
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></>}>
        <form className="space-y-4" onSubmit={handleSave}>
          <Select label="Student" value={form.student_id} onChange={(e) => setForm((f) => ({ ...f, student_id: e.target.value }))}>
            <option value="">Select student</option>
            {meta?.students.map((s) => <option key={s.id} value={s.id}>{s.profile?.full_name}</option>)}
          </Select>
          <Select label="Program (optional)" value={form.program_id} onChange={(e) => setForm((f) => ({ ...f, program_id: e.target.value }))}>
            <option value="">General</option>
            {meta?.programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Input label="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Punctuality, Communication" />
          <Select label="Severity" value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
            <option value="note">Note</option>
            <option value="minor">Minor</option>
            <option value="major">Major</option>
            <option value="critical">Critical</option>
          </Select>
          <Input label="Date" type="date" value={form.occurred_at} onChange={(e) => setForm((f) => ({ ...f, occurred_at: e.target.value }))} />
          <Textarea label="Description" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </form>
      </Modal>
    </AdminLayout>
  );
}
