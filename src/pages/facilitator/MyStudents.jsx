import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FacilitatorLayout from "./FacilitatorLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { PageHeader, Card, StatusBadge, Input } from "../../components/UI";
import DataTable from "../../components/DataTable";
import { EmptyState, ErrorState } from "../../components/AsyncStates";
import { Users, Search } from "lucide-react";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

export default function MyStudents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    if (!user) return { data: null };
    const { data: fp, error: fpErr } = await supabase
      .from("facilitator_programs")
      .select("program_id")
      .eq("facilitator_id", user.id);
    if (fpErr) return { error: fpErr };

    const programIds = (fp || []).map((r) => r.program_id);
    if (programIds.length === 0) return { data: [] };

    const { data: enrollments, error } = await supabase
      .from("enrollments")
      .select("id, status, program:programs(name), student:students(id, student_code, status, profile:profiles(full_name, email))")
      .in("program_id", programIds);
    if (error) return { error };

    const seen = new Map();
    enrollments.forEach((e) => {
      if (!e.student) return;
      if (!seen.has(e.student.id)) {
        seen.set(e.student.id, { ...e.student, programs: [e.program?.name], enrollmentStatus: e.status });
      } else {
        seen.get(e.student.id).programs.push(e.program?.name);
      }
    });
    return { data: Array.from(seen.values()) };
  }, [user?.id]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (!debouncedSearch) return data;
    const q = debouncedSearch.toLowerCase();
    return data.filter(
      (s) =>
        s.profile?.full_name?.toLowerCase().includes(q) ||
        s.profile?.email?.toLowerCase().includes(q) ||
        s.student_code?.toLowerCase().includes(q)
    );
  }, [data, debouncedSearch]);

  if (error) {
    return (
      <FacilitatorLayout>
        <ErrorState onRetry={refetch} />
      </FacilitatorLayout>
    );
  }

  return (
    <FacilitatorLayout>
      <PageHeader
        title="My Students"
        description="Students enrolled in your assigned programs."
        action={
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-300" />
            <Input placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        }
      />

      <Card>
        {!loading && filtered.length === 0 ? (
          <EmptyState title="No students found" description={debouncedSearch ? "Try a different search term." : "No students are enrolled in your programs yet."} icon={Users} />
        ) : (
          <DataTable
            loading={loading}
            rows={filtered}
            keyField="id"
            columns={[
              { key: "name", header: "Name", render: (r) => (
                <button onClick={() => navigate(`/facilitator/students/${r.id}`)} className="font-medium text-ink-900 hover:underline">
                  {r.profile?.full_name}
                </button>
              ) },
              { key: "student_code", header: "Code" },
              { key: "email", header: "Email", render: (r) => r.profile?.email },
              { key: "programs", header: "Programs", render: (r) => r.programs.filter(Boolean).join(", ") },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ]}
          />
        )}
      </Card>
    </FacilitatorLayout>
  );
}
