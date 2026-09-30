import StudentLayout from "./StudentLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, StatusBadge } from "../../components/UI";
import { CardSkeleton, EmptyState, ErrorState } from "../../components/AsyncStates";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";

export default function TrainingSchedule() {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    if (!user) return { data: null };

    const { data: enrollments, error: enrErr } = await supabase
      .from("enrollments")
      .select("program_id")
      .eq("student_id", user.id);
    if (enrErr) return { error: enrErr };

    const programIds = [...new Set((enrollments || []).map((e) => e.program_id))];
    if (programIds.length === 0) return { data: [] };

    const { data, error } = await supabase
      .from("training_sessions")
      .select("id, name, start_date, end_date, duration_weeks, status, program:programs(name)")
      .in("program_id", programIds)
      .order("start_date", { ascending: true });
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
      <PageHeader title="Training Schedule" description="Sessions for the programs you're enrolled in." />

      {loading ? (
        <CardSkeleton count={3} />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState title="No training sessions scheduled" description="Sessions will appear here once they're scheduled for your program." icon={CalendarDays} />
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((s) => (
            <Card key={s.id} className="!p-0">
              <div className="flex items-center gap-4 p-4">
                <div className="h-12 w-12 rounded-card bg-warn-50 text-warn-700 flex flex-col items-center justify-center shrink-0">
                  <span className="text-[10px] font-medium uppercase">
                    {s.start_date ? format(new Date(s.start_date), "MMM") : "—"}
                  </span>
                  <span className="text-sm font-semibold leading-none">
                    {s.start_date ? format(new Date(s.start_date), "d") : "—"}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink-900 truncate">{s.name}</p>
                  <p className="text-xs text-ink-400 mt-0.5 truncate">
                    {s.program?.name}
                    {s.end_date && ` · Ends ${format(new Date(s.end_date), "MMM d, yyyy")}`}
                  </p>
                </div>
                <StatusBadge status={s.status} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </StudentLayout>
  );
}
