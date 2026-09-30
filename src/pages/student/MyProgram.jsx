import StudentLayout from "./StudentLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, StatusBadge } from "../../components/UI";
import { CardSkeleton, EmptyState, ErrorState } from "../../components/AsyncStates";
import { BookOpen, Clock, DollarSign } from "lucide-react";
import { format } from "date-fns";

export default function MyProgram() {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    if (!user) return { data: null };
    const { data, error } = await supabase
      .from("enrollments")
      .select(
        "id, status, payment_status, enrollment_date, final_assessment_score, program:programs(id, name, program_code, description, duration_weeks, price, status), facilitator:facilitators(id, facilitator_code, bio, specialization, profile:profiles(full_name, email))"
      )
      .eq("student_id", user.id)
      .order("enrollment_date", { ascending: false });
    return { data, error };
  }, [user?.id]);

  if (error) {
    return (
      <StudentLayout>
        <ErrorState onRetry={refetch} />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <PageHeader title="My Program" description="Programs you are enrolled in." />

      {loading ? (
        <CardSkeleton count={2} />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState
            title="No program enrollment"
            description="You are not currently enrolled in any program. Contact your administrator to get enrolled."
            icon={BookOpen}
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {data.map((enr) => (
            <Card key={enr.id}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold text-ink-900">{enr.program?.name}</p>
                  <p className="text-xs text-ink-400 mt-0.5">{enr.program?.program_code}</p>
                </div>
                <div className="flex gap-2">
                  <StatusBadge status={enr.status} />
                  <StatusBadge status={enr.payment_status} />
                </div>
              </div>

              {enr.program?.description && (
                <p className="text-sm text-ink-600 mt-3 leading-relaxed">{enr.program.description}</p>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-ink-100">
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-ink-400" />
                  <div>
                    <p className="text-xs text-ink-400">Duration</p>
                    <p className="text-sm font-medium text-ink-800">
                      {enr.program?.duration_weeks ? `${enr.program.duration_weeks} weeks` : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign size={15} className="text-ink-400" />
                  <div>
                    <p className="text-xs text-ink-400">Price</p>
                    <p className="text-sm font-medium text-ink-800">
                      {enr.program?.price != null ? `₦${Number(enr.program.price).toLocaleString()}` : "—"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-ink-400">Enrolled</p>
                  <p className="text-sm font-medium text-ink-800">
                    {enr.enrollment_date && format(new Date(enr.enrollment_date), "MMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-400">Final assessment</p>
                  <p className="text-sm font-medium text-ink-800">
                    {enr.final_assessment_score != null ? `${enr.final_assessment_score}%` : "Not yet recorded"}
                  </p>
                </div>
              </div>

              {enr.facilitator && (
                <div className="mt-5 pt-5 border-t border-ink-100">
                  <p className="text-xs text-ink-400 mb-2">Facilitator</p>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-ink-800 text-white flex items-center justify-center text-xs font-semibold">
                      {enr.facilitator.profile?.full_name?.slice(0, 2).toUpperCase() || "FA"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink-900">{enr.facilitator.profile?.full_name}</p>
                      <p className="text-xs text-ink-400">{enr.facilitator.specialization || enr.facilitator.facilitator_code}</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </StudentLayout>
  );
}
