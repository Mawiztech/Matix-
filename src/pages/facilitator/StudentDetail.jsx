import { useParams, Link } from "react-router-dom";
import FacilitatorLayout from "./FacilitatorLayout";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, StatusBadge, ProgressBar } from "../../components/UI";
import { CardSkeleton, EmptyState, ErrorState } from "../../components/AsyncStates";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";

export default function FacStudentDetail() {
  const { id } = useParams();

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    const [profileRes, studentRes, enrollmentsRes, attendanceRes, progressRes, submissionsRes] = await Promise.all([
      supabase.from("profiles").select("full_name, email, phone").eq("id", id).maybeSingle(),
      supabase.from("students").select("student_code, status, gender, date_of_birth").eq("id", id).maybeSingle(),
      supabase.from("enrollments").select("id, status, payment_status, program:programs(name)").eq("student_id", id),
      supabase.from("attendance").select("status").eq("student_id", id),
      supabase.from("progress").select("percentage, program:programs(name)").eq("student_id", id),
      supabase.from("assignment_submissions").select("id, status, score, submitted_at, assignment:assignments(title)").eq("student_id", id).order("submitted_at", { ascending: false }).limit(5),
    ]);
    const err = [profileRes, studentRes, enrollmentsRes, attendanceRes, progressRes, submissionsRes].find((r) => r.error);
    if (err) return { error: err.error };
    return {
      data: {
        profile: profileRes.data,
        student: studentRes.data,
        enrollments: enrollmentsRes.data || [],
        attendance: attendanceRes.data || [],
        progress: progressRes.data || [],
        submissions: submissionsRes.data || [],
      },
    };
  }, [id]);

  if (error) {
    return (
      <FacilitatorLayout>
        <ErrorState onRetry={refetch} description="This student may not be in one of your assigned programs." />
      </FacilitatorLayout>
    );
  }

  const attendancePct = data?.attendance.length
    ? Math.round((data.attendance.filter((a) => a.status === "present").length / data.attendance.length) * 100)
    : null;

  return (
    <FacilitatorLayout>
      <Link to="/facilitator/students" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 mb-4">
        <ArrowLeft size={15} /> Back to students
      </Link>

      {loading ? (
        <CardSkeleton count={2} />
      ) : !data?.profile ? (
        <Card><p className="text-sm text-ink-500 text-center py-8">Student not found.</p></Card>
      ) : (
        <>
          <PageHeader
            title={data.profile.full_name}
            description={`${data.student?.student_code || ""} · ${data.profile.email}`}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card title="Programs" className="lg:col-span-1">
              {data.enrollments.length === 0 ? (
                <EmptyState title="No enrollments" />
              ) : (
                <div className="space-y-3">
                  {data.enrollments.map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-sm">
                      <span className="text-ink-800">{e.program?.name}</span>
                      <StatusBadge status={e.status} />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Attendance" className="lg:col-span-1">
              <p className="font-display text-2xl font-semibold text-ink-900">{attendancePct != null ? `${attendancePct}%` : "—"}</p>
              <p className="text-xs text-ink-400 mt-1">{data.attendance.length} session(s) recorded</p>
            </Card>

            <Card title="Progress" className="lg:col-span-1">
              {data.progress.length === 0 ? (
                <EmptyState title="No progress recorded" />
              ) : (
                <div className="space-y-3">
                  {data.progress.map((p, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-ink-500">{p.program?.name}</span>
                        <span className="text-ink-700 font-medium">{p.percentage}%</span>
                      </div>
                      <ProgressBar percentage={Number(p.percentage)} />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card title="Recent Submissions" className="mt-5">
            {data.submissions.length === 0 ? (
              <EmptyState title="No submissions yet" />
            ) : (
              <div className="divide-y divide-ink-50">
                {data.submissions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0 text-sm">
                    <span className="text-ink-800">{s.assignment?.title}</span>
                    <div className="flex items-center gap-3">
                      {s.score != null && <span className="text-ink-500">{s.score}</span>}
                      <StatusBadge status={s.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </FacilitatorLayout>
  );
}
