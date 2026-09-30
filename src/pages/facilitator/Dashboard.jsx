import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Users, BookOpen, CheckSquare, TrendingUp, FileText, ArrowRight, CalendarDays, Bell } from "lucide-react";
import FacilitatorLayout from "./FacilitatorLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { StatCard, PageHeader, Card, StatusBadge } from "../../components/UI";
import { StatSkeleton, CardSkeleton, EmptyState, ErrorState } from "../../components/AsyncStates";
import { format } from "date-fns";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export default function FacilitatorDashboard() {
  const { user, profile } = useAuth();

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    if (!user) return { data: null };

    const { data: assignedPrograms, error: fpErr } = await supabase
      .from("facilitator_programs")
      .select("program:programs(id, name, program_code, status)")
      .eq("facilitator_id", user.id);
    if (fpErr) return { error: fpErr };

    const programIds = (assignedPrograms || []).map((fp) => fp.program?.id).filter(Boolean);

    const [enrollmentsRes, attendanceRes, progressRes, assignmentsRes, sessionsRes, notificationsRes] = await Promise.all([
      programIds.length
        ? supabase.from("enrollments").select("id, student_id, status, program_id").in("program_id", programIds)
        : Promise.resolve({ data: [] }),
      programIds.length
        ? supabase.from("attendance").select("status").in("program_id", programIds)
        : Promise.resolve({ data: [] }),
      programIds.length
        ? supabase.from("progress").select("percentage, program_id").in("program_id", programIds)
        : Promise.resolve({ data: [] }),
      programIds.length
        ? supabase.from("assignments").select("id, title, deadline, program_id").eq("facilitator_id", user.id).order("deadline", { ascending: true }).limit(5)
        : Promise.resolve({ data: [] }),
      programIds.length
        ? supabase.from("training_sessions").select("id, name, start_date, program_id").in("program_id", programIds).gte("start_date", new Date().toISOString().slice(0, 10)).order("start_date", { ascending: true }).limit(4)
        : Promise.resolve({ data: [] }),
      supabase
        .from("notification_recipients")
        .select("id, is_read, notifications(title, body, created_at)")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(4),
    ]);

    let pendingSubmissions = 0;
    if (programIds.length) {
      const { data: assignmentIds } = await supabase.from("assignments").select("id").eq("facilitator_id", user.id);
      const ids = (assignmentIds || []).map((a) => a.id);
      if (ids.length) {
        const { count } = await supabase
          .from("assignment_submissions")
          .select("id", { count: "exact", head: true })
          .in("assignment_id", ids)
          .neq("status", "graded");
        pendingSubmissions = count || 0;
      }
    }

    return {
      data: {
        programs: (assignedPrograms || []).map((fp) => fp.program).filter(Boolean),
        enrollments: enrollmentsRes.data || [],
        attendance: attendanceRes.data || [],
        progress: progressRes.data || [],
        assignments: assignmentsRes.data || [],
        sessions: sessionsRes.data || [],
        notifications: notificationsRes.data || [],
        pendingSubmissions,
      },
    };
  }, [user?.id]);

  const stats = useMemo(() => {
    if (!data) return null;
    const uniqueStudents = new Set(data.enrollments.map((e) => e.student_id));
    const attendancePct = data.attendance.length
      ? Math.round((data.attendance.filter((a) => a.status === "present").length / data.attendance.length) * 100)
      : null;
    const avgProgress = data.progress.length
      ? Math.round(data.progress.reduce((s, p) => s + Number(p.percentage || 0), 0) / data.progress.length)
      : null;

    const programNameById = Object.fromEntries(data.programs.map((p) => [p.id, p.name]));
    const progressByProgram = {};
    data.progress.forEach((p) => {
      const name = programNameById[p.program_id] || "Other";
      if (!progressByProgram[name]) progressByProgram[name] = { total: 0, count: 0 };
      progressByProgram[name].total += Number(p.percentage || 0);
      progressByProgram[name].count += 1;
    });
    const progressChartData = Object.entries(progressByProgram).map(([name, v]) => ({
      name: name.length > 16 ? name.slice(0, 15) + "…" : name,
      avg: Math.round(v.total / v.count),
    }));

    return { studentCount: uniqueStudents.size, attendancePct, avgProgress, progressChartData };
  }, [data]);

  if (error) {
    return (
      <FacilitatorLayout>
        <ErrorState onRetry={refetch} />
      </FacilitatorLayout>
    );
  }

  return (
    <FacilitatorLayout>
      <PageHeader title={`Welcome back${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`} description="Here's what's happening across your programs." />

      {loading ? (
        <StatSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Assigned Students" value={stats.studentCount} icon={Users} accent="ink" />
          <StatCard label="Assigned Programs" value={data.programs.length} icon={BookOpen} accent="amber" />
          <StatCard label="Avg. Attendance" value={stats.attendancePct != null ? `${stats.attendancePct}%` : "—"} icon={CheckSquare} accent="emerald" />
          <StatCard label="Pending Submissions" value={data.pendingSubmissions} icon={FileText} accent="rose" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
        <div className="lg:col-span-2 space-y-5">
          {stats?.progressChartData?.length > 0 && (
            <Card title="Average progress by program">
              <div style={{ width: "100%", height: 200 }}>
                <ResponsiveContainer>
                  <BarChart data={stats.progressChartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DCE2EE" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#5B729B" }} axisLine={{ stroke: "#DCE2EE" }} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#5B729B" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #DCE2EE", fontSize: 12 }} formatter={(v) => [`${v}%`, "Avg. progress"]} />
                    <Bar dataKey="avg" fill="#0B2545" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <Card
            title="My Programs"
            action={<Link to="/facilitator/programs" className="text-xs font-medium text-ink-600 hover:text-ink-900 flex items-center gap-1">View all <ArrowRight size={13} /></Link>}
          >
            {loading ? (
              <CardSkeleton count={2} />
            ) : data.programs.length === 0 ? (
              <EmptyState title="No programs assigned" description="You haven't been assigned to any programs yet." icon={BookOpen} />
            ) : (
              <div className="divide-y divide-ink-50">
                {data.programs.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-ink-900">{p.name}</p>
                      <p className="text-xs text-ink-400">{p.program_code}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card
            title="Upcoming Assignment Deadlines"
            action={<Link to="/facilitator/assignments" className="text-xs font-medium text-ink-600 hover:text-ink-900 flex items-center gap-1">View all <ArrowRight size={13} /></Link>}
          >
            {loading ? (
              <CardSkeleton count={2} />
            ) : data.assignments.length === 0 ? (
              <EmptyState title="No assignments yet" icon={FileText} />
            ) : (
              <div className="divide-y divide-ink-50">
                {data.assignments.map((a) => (
                  <Link key={a.id} to={`/facilitator/assignments/${a.id}`} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:opacity-70 transition-opacity">
                    <p className="text-sm font-medium text-ink-900 truncate">{a.title}</p>
                    <span className="text-xs text-ink-400 shrink-0 ml-2">{a.deadline ? format(new Date(a.deadline), "MMM d") : "No due date"}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Upcoming Sessions" action={<Link to="/facilitator/sessions" className="text-xs font-medium text-ink-600 hover:text-ink-900">View all</Link>}>
            {loading ? (
              <CardSkeleton count={1} />
            ) : data.sessions.length === 0 ? (
              <EmptyState title="No upcoming sessions" icon={CalendarDays} />
            ) : (
              <div className="space-y-3">
                {data.sessions.map((s) => (
                  <div key={s.id} className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-card bg-warn-50 text-warn-700 flex items-center justify-center shrink-0">
                      <CalendarDays size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900 truncate">{s.name}</p>
                      <p className="text-xs text-ink-400">{s.start_date && format(new Date(s.start_date), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Notifications" action={<Link to="/facilitator/notifications" className="text-xs font-medium text-ink-600 hover:text-ink-900">View all</Link>}>
            {loading ? (
              <CardSkeleton count={1} />
            ) : data.notifications.length === 0 ? (
              <EmptyState title="No notifications" icon={Bell} />
            ) : (
              <div className="space-y-3">
                {data.notifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-2">
                    {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-warn-500 mt-1.5 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900 truncate">{n.notifications?.title}</p>
                      <p className="text-xs text-ink-500 line-clamp-1">{n.notifications?.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </FacilitatorLayout>
  );
}
