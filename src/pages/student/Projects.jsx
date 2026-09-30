import StudentLayout from "./StudentLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, StatusBadge } from "../../components/UI";
import { CardSkeleton, EmptyState, ErrorState } from "../../components/AsyncStates";
import { FolderKanban } from "lucide-react";
import { format } from "date-fns";

export default function StudentProjects() {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    if (!user) return { data: null };
    const { data, error } = await supabase
      .from("projects")
      .select("id, title, description, status, score, max_score, feedback, created_at, program:programs(name)")
      .eq("assigned_to", user.id)
      .order("created_at", { ascending: false });
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
      <PageHeader title="Projects" description="Projects assigned to you." />

      {loading ? (
        <CardSkeleton count={3} />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState title="No projects assigned yet" description="Projects assigned to you by your facilitator will appear here." icon={FolderKanban} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-ink-900 line-clamp-2">{p.title}</p>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-xs text-ink-400 mt-1">{p.program?.name}</p>
              {p.description && <p className="text-sm text-ink-500 mt-2 line-clamp-3">{p.description}</p>}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-ink-100">
                <span className="text-xs text-ink-400">
                  {p.created_at && format(new Date(p.created_at), "MMM d, yyyy")}
                </span>
                {p.score != null ? (
                  <span className="text-sm font-semibold text-ink-900">
                    {p.score}/{p.max_score ?? 100}
                  </span>
                ) : (
                  <span className="text-xs text-ink-400">Not graded</span>
                )}
              </div>
              {p.feedback && (
                <p className="text-sm text-ink-600 mt-3 pt-3 border-t border-ink-100">{p.feedback}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </StudentLayout>
  );
}
