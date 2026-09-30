import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { PageHeader, Card, StatusBadge, Input, Select, Button, Modal } from "../../components/UI";
import DataTable from "../../components/DataTable";
import { EmptyState, ErrorState } from "../../components/AsyncStates";
import { Users, Search, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { friendlyError } from "../../lib/friendlyError";

const PAGE_SIZE = 15;

export default function AdminStudents() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", student_code: "" });
  const [saving, setSaving] = useState(false);

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    let query = supabase
      .from("students")
      .select("id, student_code, status, created_at, profile:profiles(full_name, email)", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (statusFilter) query = query.eq("status", statusFilter);

    const { data, error, count } = await query;
    if (error) return { error };
    return { data: { rows: data, count } };
  }, [statusFilter, page]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!debouncedSearch) return data.rows;
    const q = debouncedSearch.toLowerCase();
    return data.rows.filter(
      (s) => s.profile?.full_name?.toLowerCase().includes(q) || s.profile?.email?.toLowerCase().includes(q) || s.student_code?.toLowerCase().includes(q)
    );
  }, [data, debouncedSearch]);

  const totalPages = data ? Math.ceil((data.count || 0) / PAGE_SIZE) : 0;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.password || form.password.length < 8) {
      toast.error("Please fill in name, email, and a password of at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      // Creating another person's account must never touch the admin's own
      // browser session. supabase.auth.signUp() would sign the caller in as
      // the new user, so account creation is delegated to the admin-users
      // Edge Function, which holds the service-role key server-side only.
      const { data: result, error: fnError } = await supabase.functions.invoke("admin-users", {
        body: {
          action: "create-user",
          role: "student",
          email: form.email.trim(),
          password: form.password,
          fullName: form.full_name.trim(),
        },
      });
      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);

      if (form.student_code.trim() && result?.userId) {
        await supabase.from("students").update({ student_code: form.student_code.trim() }).eq("id", result.userId);
      }

      toast.success("Student account created");
      setModalOpen(false);
      setForm({ full_name: "", email: "", password: "", student_code: "" });
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't create student account."));
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
        title="Students"
        description="Manage all students on the platform."
        action={<Button onClick={() => setModalOpen(true)}><Plus size={15} /> Add student</Button>}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
          <Input placeholder="Search by name, email or code..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} className="w-full sm:w-44">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </Select>
      </div>

      <Card>
        {!loading && filtered.length === 0 ? (
          <EmptyState title="No students found" description={debouncedSearch ? "Try a different search term." : "No students match this filter."} icon={Users} />
        ) : (
          <>
            <DataTable
              loading={loading}
              rows={filtered}
              columns={[
                { key: "name", header: "Name", render: (r) => (
                  <button onClick={() => navigate(`/admin/students/${r.id}`)} className="font-medium text-ink-900 hover:underline">{r.profile?.full_name}</button>
                ) },
                { key: "email", header: "Email", render: (r) => r.profile?.email },
                { key: "student_code", header: "Code" },
                { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
              ]}
            />
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-ink-100">
                <span className="text-xs text-ink-400">Page {page + 1} of {totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add student"
        footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create"}</Button></>}>
        <form className="space-y-4" onSubmit={handleCreate}>
          <Input label="Full name" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <Input label="Temporary password" type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="At least 8 characters" />
          <Input label="Student code (optional)" value={form.student_code} onChange={(e) => setForm((f) => ({ ...f, student_code: e.target.value }))} />
        </form>
      </Modal>
    </AdminLayout>
  );
}
