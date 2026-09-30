import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, Select, Input, Button, Modal, ProgressBar } from "../../components/UI";
import DataTable from "../../components/DataTable";
import { EmptyState, ErrorState } from "../../components/AsyncStates";
import { TrendingUp } from "lucide-react";
import toast from "react-hot-toast";
import { friendlyError } from "../../lib/friendlyError";

export default function AdminProgress() {
  const [programFilter, setProgramFilter] = useState("");
  const [editing, setEditing] = useState(null);
  const [pctValue, setPctValue] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: programs } = useSupabaseQuery(async () => {
    const { data } = await supabase.from("programs").select("id, name");
    return { data: data || [] };
  }, []);

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    let query = supabase
      .from("progress")
      .select("id, percentage, status, student:students(profile:profiles(full_name)), program:programs(name)")
      .order("updated_at", { ascending: false });
    if (programFilter) query = query.eq("program_id", programFilter);
    const { data, error } = await query;
    return { data, error };
  }, [programFilter]);

  const openEdit = (row) => {
    setEditing(row);
    setPctValue(row.percentage);
  };

  const handleSave = async () => {
    const pct = Number(pctValue);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      toast.error("Percentage must be between 0 and 100.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("progress").update({ percentage: pct, updated_at: new Date().toISOString() }).eq("id", editing.id);
      if (error) throw error;
      toast.success("Progress updated");
      setEditing(null);
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't update progress."));
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
      <PageHeader title="Progress" description="View and edit student progress across all programs." />

      <div className="mb-5 max-w-xs">
        <Select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
          <option value="">All programs</option>
          {programs?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      <Card>
        {!loading && (!data || data.length === 0) ? (
          <EmptyState title="No progress has been recorded yet" icon={TrendingUp} />
        ) : (
          <DataTable
            loading={loading}
            rows={data || []}
            columns={[
              { key: "student", header: "Student", render: (r) => r.student?.profile?.full_name },
              { key: "program", header: "Program", render: (r) => r.program?.name },
              { key: "progress", header: "Progress", render: (r) => (
                <div className="flex items-center gap-2 min-w-[140px]">
                  <ProgressBar percentage={Number(r.percentage)} />
                  <span className="text-xs text-ink-600 w-9 shrink-0">{r.percentage}%</span>
                </div>
              ) },
              { key: "actions", header: "", render: (r) => <button onClick={() => openEdit(r)} className="text-xs font-medium text-ink-600 hover:text-ink-900">Edit</button> },
            ]}
          />
        )}
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit progress"
        footer={<><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></>}>
        <Input label="Percentage complete" type="number" min="0" max="100" value={pctValue} onChange={(e) => setPctValue(e.target.value)} />
      </Modal>
    </AdminLayout>
  );
}
