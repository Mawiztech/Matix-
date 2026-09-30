import StudentLayout from "./StudentLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, ProgressBar } from "../../components/UI";
import { EmptyState, ErrorState, CardSkeleton } from "../../components/AsyncStates";
import { TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function StudentProgress() {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    if (!user) return { data: null };
    const { data, error } = await supabase
      .from("progress")
      .select("id, percentage, status, notes, updated_at, program:programs(name)")
      .eq("student_id", user.id)
      .order("updated_at", { ascending: false });
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
      <PageHeader title="Progress" description="Your training progress by program." />

      {loading ? (
        <CardSkeleton count={2} />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState
            title="No progress has been recorded yet"
            description="Your facilitator will update your progress as you move through the program."
            icon={TrendingUp}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map((p) => (
            <Card key={p.id}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-ink-900">{p.program?.name || "Program"}</p>
                <p className="font-display text-lg font-semibold text-ink-900">{Number(p.percentage)}%</p>
              </div>
              <ProgressBar percentage={Number(p.percentage)} colorClass="bg-warn-500" />
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-ink-100 text-center">
                <div>
                  <p className="text-xs text-ink-400">Completed</p>
                  <p className="text-sm font-semibold text-good-600">{Number(p.percentage)}%</p>
                </div>
                <div>
                  <p className="text-xs text-ink-400">Remaining</p>
                  <p className="text-sm font-semibold text-ink-700">{100 - Number(p.percentage)}%</p>
                </div>
                <div>
                  <p className="text-xs text-ink-400">Status</p>
                  <p className="text-sm font-semibold text-ink-700 capitalize">{p.status || "In progress"}</p>
                </div>
              </div>
              {p.notes && (
                <p className="text-sm text-ink-600 mt-4 pt-4 border-t border-ink-100">{p.notes}</p>
              )}
              <p className="text-xs text-ink-400 mt-3">
                Last updated {p.updated_at && format(new Date(p.updated_at), "MMM d, yyyy")}
              </p>
            </Card>
          ))}
        </div>
      )}
    </StudentLayout>
  );
}
