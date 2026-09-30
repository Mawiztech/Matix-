import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen, CheckSquare, TrendingUp, FileText, Bell, CalendarDays, ArrowRight,
} from "lucide-react";
import StudentLayout from "./StudentLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { StatCard, PageHeader, StatusBadge, ProgressBar, Card } from "../../components/UI";
import { StatSkeleton, CardSkeleton, EmptyState, ErrorState } from "../../components/AsyncStates";
import { format } from "date-fns";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export default function StudentDashboard() {
  const { user, profile } = useAuth();

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    if (!user) return { data: null };

    const [
      studentRes,
      enrollmentsRes,
      attendanceRes,
      progressRes,
      assignmentsRes,
      submissionsRes,
      notificationsRes,
      sessionsRes,
    ] = await Promise.all([
      supabase.from("students").select("student_code, status").eq("id", user.id).maybeSingle(),
      supabase
        .from("enrollments")
        .select("id, status, payment_status, enrollment_date, program:programs(id, name, program_code)")
        .eq("student_id", user.id)
        .order("enrollment_date", { ascending: false }),
      supabase.from("attendance").select("status, session_date").eq("student_id", user.id).order("session_date", { ascending: true }),
      supabase.from("progress").select("percentage, program_id").eq("student_id", user.id),
      supabase
        .from("assignments")
        .select("id, title, deadline, status, program_id")
        .eq("status", "published")
        .order("deadline", { ascending: true })
        .limit(5),
      supabase.from("assignment_submissions").select("id, assignment_id, status, score").eq("student_id", user.id),
      supabase
        .from("notification_recipients")
        .select("id, is_read, created_at, notifications(title, body, created_at)")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
        .limit(4),
      supabase
        .from("training_sessions")
        .select("id, name, start_date, end_date, program_id")
        .gte("start_date", new Date().toISOString().slice(0, 10))
        .order("start_date", { ascending: true })
        .limit(4),
    ]);

    const firstErr = [
      studentRes, enrollmentsRes, attendanceRes, progressRes,
      assignmentsRes, submissionsRes, notificationsRes, sessionsRes,
    ].find((r) => r.error);
    if (firstErr) return { error: firstErr.error };

    return {
      data: {
        student: studentRes.data,
        enrollments: enrollmentsRes.data || [],
        attendance: attendanceRes.data || [],
        progress: progressRes.data || [],
        assignments: assignmentsRes.data || [],
        submissions: submissionsRes.data || [],
        notifications: notificationsRes.data || [],
        sessions: sessionsRes.data || [],
      },
    };
  }, [user?.id]);

  const stats = useMemo(() => {
    if (!data) return null;
    const { enrollments, attendance, progress, assignments, submissions } = data;

    const enrolledProgramIds = new Set(enrollments.map((e) => e.program?.id).filter(Boolean));
    const relevantAssignments = assignments.filter((a) => enrolledProgramIds.has(a.program_id));

    const attendancePct = attendance.length
      ? Math.round((attendance.filter((a) => a.status === "present").length / attendance.length) * 100)
      : null;

    const avgProgress = progress.length
      ? Math.round(progress.reduce((sum, p) => sum + Number(p.percentage || 0), 0) / progress.length)
      : null;

    const submittedIds = new Set(submissions.map((s) => s.assignment_id));
    const pendingCount = relevantAssignments.filter((a) => !submittedIds.has(a.id)).length;
    const gradedScores = submissions.filter((s) => s.status === "graded" && s.score != null);
    const avgScore = gradedScores.length
      ? Math.round(gradedScores.reduce((sum, s) => sum + Number(s.score), 0) / gradedScores.length)
      : null;

    // Running attendance percentage over time, for a trend line.
    let presentSoFar = 0;
    const attendanceTrend = attendance.map((a, i) => {
      if (a.status === "present") presentSoFar++;
      return {
        date: a.session_date ? format(new Date(a.session_date), "MMM d") : `#${i + 1}`,
        rate: Math.round((presentSoFar / (i + 1)) * 100),
      };
    });

    return {
      attendancePct,
      avgProgress,
      pendingCount,
      avgScore,
      relevantAssignments,
      currentEnrollment: enrollments[0] || null,
      attendanceTrend,
    };
  }, [data]);

  if (error) {
    return (
      <StudentLayout>
        <ErrorState onRetry={refetch} description="We couldn't load your dashboard. Please try again." />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <PageHeader
        title={`Welcome back${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`}
        description={data?.student?.student_code ? `Student code: ${data.student.student_code}` : undefined}
      />

      {loading ? (
        <StatSkeleton />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Overall Progress"
            value={stats.avgProgress != null ? `${stats.avgProgress}%` : "—"}
            icon={TrendingUp}
            accent="amber"
          />
          <StatCard
            label="Attendance"
            value={stats.attendancePct != null ? `${stats.attendancePct}%` : "—"}
            icon={CheckSquare}
            accent="emerald"
          />
          <StatCard
            label="Pending Assignments"
            value={stats.pendingCount}
            icon={FileText}
            accent="rose"
          />
          <StatCard
            label="Average Score"
            value={stats.avgScore != null ? `${stats.avgScore}%` : "—"}
            icon={BookOpen}
            accent="ink"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
        <div className="lg:col-span-2 space-y-5">
          {stats?.attendanceTrend?.length >= 3 && (
            <Card title="Attendance trend">
              <div style={{ width: "100%", height: 180 }}>
                <ResponsiveContainer>
                  <LineChart data={stats.attendanceTrend} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DCE2EE" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5B729B" }} axisLine={{ stroke: "#DCE2EE" }} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#5B729B" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid #DCE2EE", fontSize: 12 }}
                      formatter={(v) => [`${v}%`, "Attendance rate"]}
                    />
                    <Line type="monotone" dataKey="rate" stroke="#0B2545" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <Card title="Current Program">
            {loading ? (
              <CardSkeleton count={1} />
            ) : !stats.currentEnrollment ? (
              <EmptyState
                title="No program enrollment"
                description="You are not currently enrolled in a program. Contact your administrator."
                icon={BookOpen}
              />
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-display font-semibold text-ink-900">
                    {stats.currentEnrollment.program?.name}
                  </p>
                  <p className="text-xs text-ink-400 mt-0.5">
                    {stats.currentEnrollment.program?.program_code} · Enrolled{" "}
                    {stats.currentEnrollment.enrollment_date &&
                      format(new Date(stats.currentEnrollment.enrollment_date), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <StatusBadge status={stats.currentEnrollment.status} />
                  <StatusBadge status={stats.currentEnrollment.payment_status} />
                </div>
              </div>
            )}
          </Card>

          <Card
            title="Recent Assignments"
            action={
              <Link to="/student/assignments" className="text-xs font-medium text-ink-600 hover:text-ink-900 flex items-center gap-1">
                View all <ArrowRight size={13} />
              </Link>
            }
          >
            {loading ? (
              <CardSkeleton count={2} />
            ) : stats.relevantAssignments.length === 0 ? (
              <EmptyState title="No assignments yet" description="Published assignments for your program will appear here." icon={FileText} />
            ) : (
              <div className="divide-y divide-ink-50">
                {stats.relevantAssignments.slice(0, 4).map((a) => (
                  <Link
                    key={a.id}
                    to={`/student/assignments/${a.id}`}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:opacity-70 transition-opacity"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900 truncate">{a.title}</p>
                      <p className="text-xs text-ink-400 mt-0.5">
                        {a.deadline ? `Due ${format(new Date(a.deadline), "MMM d, yyyy")}` : "No due date"}
                      </p>
                    </div>
                    <ArrowRight size={14} className="text-ink-300 shrink-0 ml-2" />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card
            title="Upcoming Sessions"
            action={
              <Link to="/student/schedule" className="text-xs font-medium text-ink-600 hover:text-ink-900">
                View all
              </Link>
            }
          >
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
                      <p className="text-xs text-ink-400">
                        {s.start_date && format(new Date(s.start_date), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card
            title="Recent Notifications"
            action={
              <Link to="/student/notifications" className="text-xs font-medium text-ink-600 hover:text-ink-900">
                View all
              </Link>
            }
          >
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
    </StudentLayout>
  );
}
