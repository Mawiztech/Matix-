import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, StatusBadge, Select, Input } from "../../components/UI";
import DataTable from "../../components/DataTable";
import { EmptyState, ErrorState } from "../../components/AsyncStates";
import { CheckSquare } from "lucide-react";
import { format } from "date-fns";

const PAGE_SIZE = 25;

export default function AdminAttendance() {
  const [programFilter, setProgramFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(0);

  const { data: programs } = useSupabaseQuery(async () => {
    const { data } = await supabase.from("programs").select("id, name");
    return { data: data || [] };
  }, []);

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    let query = supabase
      .from("attendance")
      .select("id, session_date, session_label, status, student:students(profile:profiles(full_name)), program:programs(name)", { count: "exact" })
      .order("session_date", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (programFilter) query = query.eq("program_id", programFilter);
    if (dateFilter) query = query.eq("session_date", dateFilter);
    const { data, error, count } = await query;
    if (error) return { error };
    return { data: { rows: data, count } };
  }, [programFilter, dateFilter, page]);

  const totalPages = data ? Math.ceil((data.count || 0) / PAGE_SIZE) : 0;

  if (error) {
    return (
      <AdminLayout>
        <ErrorState onRetry={refetch} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader title="Attendance" description="All attendance records across the platform." />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 max-w-lg">
        <Select value={programFilter} onChange={(e) => { setProgramFilter(e.target.value); setPage(0); }}>
          <option value="">All programs</option>
          {programs?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Input type="date" value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setPage(0); }} />
      </div>

      <Card>
        {!loading && (!data?.rows || data.rows.length === 0) ? (
          <EmptyState title="No attendance records found" icon={CheckSquare} />
        ) : (
          <>
            <DataTable
              loading={loading}
              rows={data?.rows || []}
              columns={[
                { key: "date", header: "Date", render: (r) => format(new Date(r.session_date), "MMM d, yyyy") },
                { key: "student", header: "Student", render: (r) => r.student?.profile?.full_name },
                { key: "program", header: "Program", render: (r) => r.program?.name },
                { key: "session", header: "Session", render: (r) => r.session_label || "—" },
                { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
              ]}
            />
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-ink-100">
                <span className="text-xs text-ink-400">Page {page + 1} of {totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="text-xs font-medium text-ink-600 disabled:text-ink-300">Previous</button>
                  <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="text-xs font-medium text-ink-600 disabled:text-ink-300">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </AdminLayout>
  );
}
