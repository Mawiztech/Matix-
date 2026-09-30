import StudentLayout from "./StudentLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, StatusBadge, ProgressBar } from "../../components/UI";
import { CardSkeleton, EmptyState, ErrorState } from "../../components/AsyncStates";
import { Award } from "lucide-react";

const BREAKDOWN_ROWS = [
  { key: "attendance_mark", label: "Attendance" },
  { key: "assignment_mark", label: "Assignment Score" },
  { key: "project_mark", label: "Projects" },
  { key: "conduct_mark", label: "Professional Conduct" },
  { key: "final_assessment_mark", label: "Final Assessment" },
];

export default function StudentGrades() {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    if (!user) return { data: null };
    const { data, error } = await supabase
      .from("final_grades")
      .select("*, program:programs(name)")
      .eq("student_id", user.id)
      .order("computed_at", { ascending: false });
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
      <PageHeader title="Grades" description="Your final grades and score breakdown." />

      {loading ? (
        <CardSkeleton count={1} />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState
            title="No grades recorded yet"
            description="Your final grade will appear here once it has been computed by your program."
            icon={Award}
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {data.map((g) => (
            <Card key={g.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink-900">{g.program?.name}</p>
                  {g.rank && <p className="text-xs text-ink-400 mt-0.5">Class rank: #{g.rank}</p>}
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-semibold text-ink-900">
                    {g.total_score != null ? `${g.total_score}%` : "—"}
                  </p>
                  <p className="text-xs text-ink-400">{g.letter_grade || "Not graded"}</p>
                </div>
              </div>

              {g.remark && (
                <div className="mt-3">
                  <StatusBadge status={g.remark.toLowerCase()} />
                </div>
              )}

              <div className="mt-5 pt-5 border-t border-ink-100 space-y-3">
                <p className="text-xs font-medium text-ink-500">Score breakdown</p>
                {BREAKDOWN_ROWS.map((row) => (
                  <div key={row.key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-ink-600">{row.label}</span>
                      <span className="text-ink-800 font-medium">
                        {g[row.key] != null ? g[row.key] : "—"}
                      </span>
                    </div>
                    <ProgressBar percentage={g[row.key] != null ? Number(g[row.key]) : 0} />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </StudentLayout>
  );
}
