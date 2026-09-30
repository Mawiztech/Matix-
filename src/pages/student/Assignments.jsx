import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import StudentLayout from "./StudentLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, StatusBadge, Select } from "../../components/UI";
import { CardSkeleton, EmptyState, ErrorState } from "../../components/AsyncStates";
import { FileText, ArrowRight } from "lucide-react";
import { format } from "date-fns";

export default function StudentAssignments() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    if (!user) return { data: null };

    const { data: enrollments, error: enrErr } = await supabase
      .from("enrollments")
      .select("program_id")
      .eq("student_id", user.id);
    if (enrErr) return { error: enrErr };

    const programIds = [...new Set((enrollments || []).map((e) => e.program_id))];
    if (programIds.length === 0) return { data: [] };

    const [assignmentsRes, submissionsRes] = await Promise.all([
      supabase
        .from("assignments")
        .select("id, title, description, deadline, max_score, program:programs(name)")
        .in("program_id", programIds)
        .eq("status", "published")
        .order("deadline", { ascending: true }),
      supabase
        .from("assignment_submissions")
        .select("assignment_id, status, score, feedback")
        .eq("student_id", user.id),
    ]);
    if (assignmentsRes.error) return { error: assignmentsRes.error };
    if (submissionsRes.error) return { error: submissionsRes.error };

    const subMap = new Map(submissionsRes.data.map((s) => [s.assignment_id, s]));
    const merged = assignmentsRes.data.map((a) => ({ ...a, submission: subMap.get(a.id) || null }));
    return { data: merged };
  }, [user?.id]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data;
    if (filter === "pending") return data.filter((a) => !a.submission);
    if (filter === "submitted") return data.filter((a) => a.submission && a.submission.status !== "graded");
    if (filter === "graded") return data.filter((a) => a.submission?.status === "graded");
    return data;
  }, [data, filter]);

  if (error) {
    return (
      <StudentLayout>
        <ErrorState onRetry={refetch} />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <PageHeader
        title="Assignments"
        description="Published assignments for your enrolled programs."
        action={
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-40">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="graded">Graded</option>
          </Select>
        }
      />

      {loading ? (
        <CardSkeleton count={3} />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState title="No assignments found" description="Try a different filter, or check back later." icon={FileText} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => (
            <Link key={a.id} to={`/student/assignments/${a.id}`}>
              <Card className="h-full hover:border-ink-300 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-ink-900 line-clamp-2">{a.title}</p>
                  <ArrowRight size={15} className="text-ink-300 shrink-0 mt-0.5" />
                </div>
                <p className="text-xs text-ink-400 mt-1">{a.program?.name}</p>
                {a.description && <p className="text-sm text-ink-500 mt-2 line-clamp-2">{a.description}</p>}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-ink-100">
                  <span className="text-xs text-ink-400">
                    {a.deadline ? `Due ${format(new Date(a.deadline), "MMM d")}` : "No due date"}
                  </span>
                  <StatusBadge status={a.submission?.status || "pending"} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </StudentLayout>
  );
}
