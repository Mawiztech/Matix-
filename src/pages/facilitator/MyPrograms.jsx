import FacilitatorLayout from "./FacilitatorLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, StatusBadge } from "../../components/UI";
import { CardSkeleton, EmptyState, ErrorState } from "../../components/AsyncStates";
import { BookOpen, Users } from "lucide-react";

export default function MyPrograms() {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    if (!user) return { data: null };
    const { data: fp, error } = await supabase
      .from("facilitator_programs")
      .select("id, assigned_at, program:programs(id, name, program_code, description, duration_weeks, price, status)")
      .eq("facilitator_id", user.id);
    if (error) return { error };

    const programIds = fp.map((r) => r.program?.id).filter(Boolean);
    let counts = {};
    if (programIds.length) {
      const { data: enr } = await supabase.from("enrollments").select("program_id").in("program_id", programIds);
      counts = (enr || []).reduce((acc, e) => {
        acc[e.program_id] = (acc[e.program_id] || 0) + 1;
        return acc;
      }, {});
    }
    return { data: fp.map((r) => ({ ...r, studentCount: counts[r.program?.id] || 0 })) };
  }, [user?.id]);

  if (error) {
    return (
      <FacilitatorLayout>
        <ErrorState onRetry={refetch} />
      </FacilitatorLayout>
    );
  }

  return (
    <FacilitatorLayout>
      <PageHeader title="My Programs" description="Programs you're authorized to manage." />

      {loading ? (
        <CardSkeleton count={3} />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState title="No programs assigned" description="You haven't been assigned to any programs. Contact your administrator." icon={BookOpen} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-ink-900">{r.program?.name}</p>
                <StatusBadge status={r.program?.status} />
              </div>
              <p className="text-xs text-ink-400 mt-0.5">{r.program?.program_code}</p>
              {r.program?.description && <p className="text-sm text-ink-500 mt-2 line-clamp-2">{r.program.description}</p>}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-ink-100 text-sm text-ink-600">
                <Users size={14} className="text-ink-400" />
                {r.studentCount} student{r.studentCount === 1 ? "" : "s"} enrolled
              </div>
            </Card>
          ))}
        </div>
      )}
    </FacilitatorLayout>
  );
}
