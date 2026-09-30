import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import FacilitatorLayout from "./FacilitatorLayout";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { getSignedUrl, fileNameFromPath } from "../../lib/storage";
import { PageHeader, Card, StatusBadge, Input, Textarea, Button, Modal } from "../../components/UI";
import { CardSkeleton, EmptyState, ErrorState } from "../../components/AsyncStates";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { friendlyError } from "../../lib/friendlyError";

export default function FacAssignmentDetail() {
  const { id } = useParams();
  const [gradingRow, setGradingRow] = useState(null);
  const [scoreForm, setScoreForm] = useState({ score: "", feedback: "" });
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    const [assignmentRes, submissionsRes] = await Promise.all([
      supabase.from("assignments").select("*, program:programs(name)").eq("id", id).maybeSingle(),
      supabase
        .from("assignment_submissions")
        .select("id, file_url, status, score, feedback, submitted_at, student:students(student_code, profile:profiles(full_name))")
        .eq("assignment_id", id)
        .order("submitted_at", { ascending: false }),
    ]);
    if (assignmentRes.error) return { error: assignmentRes.error };
    if (submissionsRes.error) return { error: submissionsRes.error };
    return { data: { assignment: assignmentRes.data, submissions: submissionsRes.data || [] } };
  }, [id]);

  const handleDownload = async (path) => {
    const { data: url, error: err } = await getSignedUrl("assignment-submissions", path);
    if (err) {
      toast.error("Couldn't open that file.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openGrade = (row) => {
    setGradingRow(row);
    setScoreForm({ score: row.score ?? "", feedback: row.feedback || "" });
  };

  const handleGrade = async (e) => {
    e.preventDefault();
    const score = Number(scoreForm.score);
    if (Number.isNaN(score) || score < 0 || score > (data.assignment.max_score || 100)) {
      toast.error(`Score must be between 0 and ${data.assignment.max_score || 100}.`);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("assignment_submissions").update({
        score, feedback: scoreForm.feedback || null, status: "graded", graded_at: new Date().toISOString(),
      }).eq("id", gradingRow.id);
      if (error) throw error;
      toast.success("Grade saved");
      setGradingRow(null);
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't save grade."));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = () => {
    setEditForm({
      title: data.assignment.title,
      description: data.assignment.description || "",
      instructions: data.assignment.instructions || "",
      deadline: data.assignment.deadline ? data.assignment.deadline.slice(0, 16) : "",
      max_score: data.assignment.max_score || 100,
    });
    setEditOpen(true);
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from("assignments").update({
        title: editForm.title, description: editForm.description || null, instructions: editForm.instructions || null,
        deadline: editForm.deadline || null, max_score: Number(editForm.max_score) || 100,
      }).eq("id", id);
      if (error) throw error;
      toast.success("Assignment updated");
      setEditOpen(false);
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't update assignment."));
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <FacilitatorLayout>
        <ErrorState onRetry={refetch} />
      </FacilitatorLayout>
    );
  }

  return (
    <FacilitatorLayout>
      <Link to="/facilitator/assignments" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 mb-4">
        <ArrowLeft size={15} /> Back to assignments
      </Link>

      {loading ? (
        <CardSkeleton count={2} />
      ) : !data?.assignment ? (
        <Card><p className="text-sm text-ink-500 text-center py-8">Assignment not found.</p></Card>
      ) : (
        <>
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-xl font-semibold text-ink-900">{data.assignment.title}</h1>
                <p className="text-xs text-ink-400 mt-1">
                  {data.assignment.program?.name}
                  {data.assignment.deadline && ` · Due ${format(new Date(data.assignment.deadline), "MMM d, yyyy 'at' h:mm a")}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={data.assignment.status} />
                <Button variant="outline" size="sm" onClick={openEdit}>Edit</Button>
              </div>
            </div>
            {data.assignment.description && <p className="text-sm text-ink-600 mt-4">{data.assignment.description}</p>}
          </Card>

          <Card title={`Submissions (${data.submissions.length})`} className="mt-5">
            {data.submissions.length === 0 ? (
              <EmptyState title="No submissions yet" description="Submissions will appear here once students upload their work." icon={FileText} />
            ) : (
              <div className="divide-y divide-ink-50">
                {data.submissions.map((s) => (
                  <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink-900">{s.student?.profile?.full_name}</p>
                      <p className="text-xs text-ink-400">
                        {s.submitted_at ? `Submitted ${format(new Date(s.submitted_at), "MMM d, yyyy")}` : "Not submitted"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge status={s.status} />
                      {s.score != null && <span className="text-sm font-medium text-ink-800">{s.score}/{data.assignment.max_score}</span>}
                      {s.file_url && (
                        <Button variant="outline" size="sm" onClick={() => handleDownload(s.file_url)}><Download size={13} /></Button>
                      )}
                      <Button size="sm" onClick={() => openGrade(s)}>{s.status === "graded" ? "Regrade" : "Grade"}</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      <Modal
        open={!!gradingRow}
        onClose={() => setGradingRow(null)}
        title="Grade submission"
        footer={<><Button variant="outline" onClick={() => setGradingRow(null)}>Cancel</Button><Button onClick={handleGrade} disabled={saving}>{saving ? "Saving..." : "Save grade"}</Button></>}
      >
        <form className="space-y-4" onSubmit={handleGrade}>
          <Input label={`Score (out of ${data?.assignment?.max_score || 100})`} type="number" value={scoreForm.score} onChange={(e) => setScoreForm((f) => ({ ...f, score: e.target.value }))} />
          <Textarea label="Feedback" rows={3} value={scoreForm.feedback} onChange={(e) => setScoreForm((f) => ({ ...f, feedback: e.target.value }))} />
        </form>
      </Modal>

      {editForm && (
        <Modal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          title="Edit assignment"
          size="lg"
          footer={<><Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={handleEditSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></>}
        >
          <form className="space-y-4" onSubmit={handleEditSave}>
            <Input label="Title" value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} />
            <Textarea label="Description" rows={2} value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
            <Textarea label="Instructions" rows={3} value={editForm.instructions} onChange={(e) => setEditForm((f) => ({ ...f, instructions: e.target.value }))} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Deadline" type="datetime-local" value={editForm.deadline} onChange={(e) => setEditForm((f) => ({ ...f, deadline: e.target.value }))} />
              <Input label="Max score" type="number" value={editForm.max_score} onChange={(e) => setEditForm((f) => ({ ...f, max_score: e.target.value }))} />
            </div>
          </form>
        </Modal>
      )}
    </FacilitatorLayout>
  );
}
