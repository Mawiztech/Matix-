import StudentLayout from "./StudentLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { getSignedUrl } from "../../lib/storage";
import { PageHeader, Card, Button } from "../../components/UI";
import { CardSkeleton, EmptyState, ErrorState } from "../../components/AsyncStates";
import { Library, Download, Link as LinkIcon, FileText } from "lucide-react";
import toast from "react-hot-toast";

export default function StudentResources() {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    if (!user) return { data: null };

    const { data: enrollments, error: enrErr } = await supabase
      .from("enrollments")
      .select("program_id")
      .eq("student_id", user.id);
    if (enrErr) return { error: enrErr };

    const programIds = [...new Set((enrollments || []).map((e) => e.program_id))];

    let query = supabase
      .from("resources")
      .select("id, title, description, resource_type, file_url, link_url, created_at, program:programs(name)")
      .order("created_at", { ascending: false });

    if (programIds.length > 0) {
      query = query.or(`program_id.is.null,program_id.in.(${programIds.join(",")})`);
    } else {
      query = query.is("program_id", null);
    }

    const { data, error } = await query;
    return { data, error };
  }, [user?.id]);

  const handleOpen = async (resource) => {
    if (resource.link_url) {
      window.open(resource.link_url, "_blank", "noopener,noreferrer");
      return;
    }
    if (resource.file_url) {
      const { data: url, error: err } = await getSignedUrl("resources", resource.file_url);
      if (err) {
        toast.error("Couldn't open that file.");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  if (error) {
    return (
      <StudentLayout>
        <ErrorState onRetry={refetch} />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <PageHeader title="Resources" description="Materials shared for your program." />

      {loading ? (
        <CardSkeleton count={3} />
      ) : !data || data.length === 0 ? (
        <Card>
          <EmptyState title="No resources available yet" description="Resources shared by your facilitators will appear here." icon={Library} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-card bg-ink-100 text-ink-600 flex items-center justify-center shrink-0">
                  {r.link_url ? <LinkIcon size={16} /> : <FileText size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink-900 line-clamp-2">{r.title}</p>
                  <p className="text-xs text-ink-400 mt-0.5">{r.program?.name || "General"}</p>
                </div>
              </div>
              {r.description && <p className="text-sm text-ink-500 mt-3 line-clamp-2">{r.description}</p>}
              <div className="mt-4 pt-4 border-t border-ink-100 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => handleOpen(r)}>
                  <Download size={13} /> {r.link_url ? "Open link" : "Download"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </StudentLayout>
  );
}
