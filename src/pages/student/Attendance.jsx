import { useMemo } from "react";
import StudentLayout from "./StudentLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, StatusBadge, StatCard } from "../../components/UI";
import DataTable from "../../components/DataTable";
import { EmptyState, ErrorState, StatSkeleton } from "../../components/AsyncStates";
import { CheckSquare } from "lucide-react";
import { format } from "date-fns";

export default function StudentAttendance() {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    if (!user) return { data: null };
    const { data, error } = await supabase
      .from("attendance")
      .select("id, session_date, session_label, status, notes, program:programs(name)")
      .eq("student_id", user.id)
      .order("session_date", { ascending: false });
    return { data, error };
  }, [user?.id]);

  const summary = useMemo(() => {
    if (!data) return null;
    const total = data.length;
    const counts = { present: 0, absent: 0, late: 0, excused: 0 };
    data.forEach((r) => { if (counts[r.status] !== undefined) counts[r.status]++; });
    const pct = total ? Math.round((counts.present / total) * 100) : null;
    return { total, counts, pct };
  }, [data]);

  if (error) {
    return (
      <StudentLayout>
        <ErrorState onRetry={refetch} />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <PageHeader title="My Attendance" description="Your attendance record across all sessions." />

      {loading ? (
        <StatSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Attendance Rate" value={summary.pct != null ? `${summary.pct}%` : "—"} accent="amber" />
          <StatCard label="Present" value={summary.counts.present} accent="emerald" />
          <StatCard label="Late" value={summary.counts.late} accent="amber" />
          <StatCard label="Absent" value={summary.counts.absent} accent="rose" />
        </div>
      )}

      <Card title="Session History">
        {!loading && (!data || data.length === 0) ? (
          <EmptyState title="No attendance recorded yet" description="Your attendance records will appear here once a facilitator logs a session." icon={CheckSquare} />
        ) : (
          <DataTable
            loading={loading}
            rows={data || []}
            columns={[
              { key: "session_date", header: "Date", render: (r) => r.session_date && format(new Date(r.session_date), "MMM d, yyyy") },
              { key: "session_label", header: "Session", render: (r) => r.session_label || "—" },
              { key: "program", header: "Program", render: (r) => r.program?.name || "—" },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
              { key: "notes", header: "Notes", render: (r) => r.notes || "—" },
            ]}
          />
        )}
      </Card>
    </StudentLayout>
  );
}
