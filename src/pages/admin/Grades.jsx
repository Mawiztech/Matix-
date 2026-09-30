import { useState } from "react";
import AdminLayout from "./AdminLayout";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, Select } from "../../components/UI";
import DataTable from "../../components/DataTable";
import { EmptyState, ErrorState } from "../../components/AsyncStates";
import { Award } from "lucide-react";

export default function AdminGrades() {
  const [programFilter, setProgramFilter] = useState("");

  const { data: programs } = useSupabaseQuery(async () => {
    const { data } = await supabase.from("programs").select("id, name");
    return { data: data || [] };
  }, []);

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    let query = supabase
      .from("final_grades")
      .select("id, total_score, letter_grade, remark, attendance_mark, assignment_mark, project_mark, conduct_mark, final_assessment_mark, student:students(profile:profiles(full_name)), program:programs(name)")
      .order("computed_at", { ascending: false });
    if (programFilter) query = query.eq("program_id", programFilter);
    const { data, error } = await query;
    return { data, error };
  }, [programFilter]);

  if (error) {
    return (
      <AdminLayout>
        <ErrorState onRetry={refetch} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader title="Grades" description="Final grades and score breakdown across all students." />

      <div className="mb-5 max-w-xs">
        <Select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
          <option value="">All programs</option>
          {programs?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      <Card>
        {!loading && (!data || data.length === 0) ? (
          <EmptyState title="No grades recorded yet" icon={Award} />
        ) : (
          <DataTable
            loading={loading}
            rows={data || []}
            columns={[
              { key: "student", header: "Student", render: (r) => r.student?.profile?.full_name },
              { key: "program", header: "Program", render: (r) => r.program?.name },
              { key: "attendance", header: "Attendance", render: (r) => r.attendance_mark ?? "—" },
              { key: "assignment", header: "Assignment", render: (r) => r.assignment_mark ?? "—" },
              { key: "project", header: "Projects", render: (r) => r.project_mark ?? "—" },
              { key: "conduct", header: "Conduct", render: (r) => r.conduct_mark ?? "—" },
              { key: "final_assessment", header: "Final Assessment", render: (r) => r.final_assessment_mark ?? "—" },
              { key: "total", header: "Total", render: (r) => <span className="font-semibold text-ink-900">{r.total_score != null ? `${r.total_score}%` : "—"}</span> },
              { key: "letter", header: "Grade", render: (r) => r.letter_grade || "—" },
            ]}
          />
        )}
      </Card>
    </AdminLayout>
  );
}
