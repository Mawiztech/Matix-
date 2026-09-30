import AdminLayout from "./AdminLayout";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { StatCard, PageHeader, Card, StatusBadge } from "../../components/UI";
import { StatSkeleton, CardSkeleton, EmptyState, ErrorState } from "../../components/AsyncStates";
import { Users, UserCog, BookOpen, ClipboardList, CreditCard, CheckSquare, FileText, TrendingUp, Activity } from "lucide-react";
import { format } from "date-fns";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from "recharts";

const PIE_COLORS = ["#1F6F54", "#0B2545", "#C22E28", "#5B729B"];

export default function AdminDashboard() {
  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    const [
      totalStudents, activeStudents, totalFacilitators, totalPrograms,
      activeEnrollments, pendingPayments, submissions, attendanceRows, progressRows,
      recentEnrollments, enrollmentsByProgram,
    ] = await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }),
      supabase.from("students").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("facilitators").select("id", { count: "exact", head: true }),
      supabase.from("programs").select("id", { count: "exact", head: true }),
      supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("assignment_submissions").select("id", { count: "exact", head: true }),
      supabase.from("attendance").select("status"),
      supabase.from("progress").select("percentage"),
      supabase.from("enrollments").select("id, status, enrollment_date, student:students(profile:profiles(full_name)), program:programs(name)").order("enrollment_date", { ascending: false }).limit(6),
      supabase.from("enrollments").select("program:programs(name)"),
    ]);

    const firstErr = [totalStudents, activeStudents, totalFacilitators, totalPrograms, activeEnrollments, pendingPayments, submissions, attendanceRows, progressRows, recentEnrollments, enrollmentsByProgram].find((r) => r.error);
    if (firstErr) return { error: firstErr.error };

    const attendancePct = attendanceRows.data?.length
      ? Math.round((attendanceRows.data.filter((a) => a.status === "present").length / attendanceRows.data.length) * 100)
      : null;
    const avgProgress = progressRows.data?.length
      ? Math.round(progressRows.data.reduce((s, p) => s + Number(p.percentage || 0), 0) / progressRows.data.length)
      : null;

    const programCounts = {};
    (enrollmentsByProgram.data || []).forEach((e) => {
      const name = e.program?.name || "Unassigned";
      programCounts[name] = (programCounts[name] || 0) + 1;
    });
    const programChartData = Object.entries(programCounts)
      .map(([name, count]) => ({ name: name.length > 16 ? name.slice(0, 15) + "…" : name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const attendanceCounts = { present: 0, absent: 0, late: 0, excused: 0 };
    (attendanceRows.data || []).forEach((a) => {
      if (attendanceCounts[a.status] !== undefined) attendanceCounts[a.status]++;
    });
    const attendanceChartData = Object.entries(attendanceCounts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));

    return {
      data: {
        totalStudents: totalStudents.count || 0,
        activeStudents: activeStudents.count || 0,
        totalFacilitators: totalFacilitators.count || 0,
        totalPrograms: totalPrograms.count || 0,
        activeEnrollments: activeEnrollments.count || 0,
        pendingPayments: pendingPayments.count || 0,
        submissions: submissions.count || 0,
        attendancePct,
        avgProgress,
        recentEnrollments: recentEnrollments.data || [],
        programChartData,
        attendanceChartData,
      },
    };
  }, []);

  if (error) {
    return (
      <AdminLayout>
        <ErrorState onRetry={refetch} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader title="Admin Overview" description="Real-time statistics across the platform." />

      {loading ? (
        <StatSkeleton count={8} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Students" value={data.totalStudents} icon={Users} accent="ink" />
          <StatCard label="Active Students" value={data.activeStudents} icon={Users} accent="emerald" />
          <StatCard label="Total Facilitators" value={data.totalFacilitators} icon={UserCog} accent="ink" />
          <StatCard label="Total Programs" value={data.totalPrograms} icon={BookOpen} accent="amber" />
          <StatCard label="Active Enrollments" value={data.activeEnrollments} icon={ClipboardList} accent="emerald" />
          <StatCard label="Pending Payments" value={data.pendingPayments} icon={CreditCard} accent="rose" />
          <StatCard label="Submissions" value={data.submissions} icon={FileText} accent="ink" />
          <StatCard label="Avg. Attendance" value={data.attendancePct != null ? `${data.attendancePct}%` : "0"} icon={CheckSquare} accent="amber" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
        <Card title="Enrollment by Program" className="lg:col-span-2">
          {loading ? (
            <CardSkeleton count={1} />
          ) : data.programChartData.length === 0 ? (
            <EmptyState title="No enrollments yet" icon={BookOpen} />
          ) : (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={data.programChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DCE2EE" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5B729B" }} axisLine={{ stroke: "#DCE2EE" }} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11, fill: "#5B729B" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DCE2EE", fontSize: 12 }} cursor={{ fill: "#F6F8FB" }} />
                  <Bar dataKey="count" name="Enrollments" fill="#0B2545" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Attendance Breakdown" className="lg:col-span-1">
          {loading ? (
            <CardSkeleton count={1} />
          ) : data.attendanceChartData.length === 0 ? (
            <EmptyState title="No attendance recorded" icon={CheckSquare} />
          ) : (
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data.attendanceChartData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>
                    {data.attendanceChartData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DCE2EE", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-1">
            {data?.attendanceChartData?.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-ink-500 capitalize">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                {d.name}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
        <Card title="Average Progress Across Programs" className="lg:col-span-1">
          {loading ? <CardSkeleton count={1} /> : (
            <div className="flex flex-col items-center justify-center py-4">
              <p className="font-display text-4xl font-semibold text-ink-900">{data.avgProgress != null ? `${data.avgProgress}%` : "0"}</p>
              <p className="text-xs text-ink-400 mt-1">Across all recorded progress</p>
            </div>
          )}
        </Card>

        <Card title="Recent Activity" className="lg:col-span-2">
          {loading ? (
            <CardSkeleton count={2} />
          ) : data.recentEnrollments.length === 0 ? (
            <EmptyState title="No recent activity" icon={Activity} />
          ) : (
            <div className="divide-y divide-ink-50">
              {data.recentEnrollments.map((e) => (
                <div key={e.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate">{e.student?.profile?.full_name}</p>
                    <p className="text-xs text-ink-400">
                      Enrolled in {e.program?.name} {e.enrollment_date && `· ${format(new Date(e.enrollment_date), "MMM d, yyyy")}`}
                    </p>
                  </div>
                  <StatusBadge status={e.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
