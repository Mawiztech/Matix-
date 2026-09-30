import { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import StudentLayout from "./StudentLayout";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { uploadSubmissionFile, getSignedUrl, formatFileSize, fileNameFromPath } from "../../lib/storage";
import { PageHeader, Card, StatusBadge, Button } from "../../components/UI";
import { CardSkeleton, ErrorState } from "../../components/AsyncStates";
import { ArrowLeft, UploadCloud, FileText, Download, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { friendlyError } from "../../lib/friendlyError";
import toast from "react-hot-toast";

export default function AssignmentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data, loading, error, refetch } = useSupabaseQuery(async () => {
    const [assignmentRes, submissionRes] = await Promise.all([
      supabase.from("assignments").select("id, title, description, instructions, deadline, max_score, status, program:programs(name)").eq("id", id).maybeSingle(),
      supabase.from("assignment_submissions").select("*").eq("assignment_id", id).eq("student_id", user.id).maybeSingle(),
    ]);
    if (assignmentRes.error) return { error: assignmentRes.error };
    if (submissionRes.error) return { error: submissionRes.error };
    return { data: { assignment: assignmentRes.data, submission: submissionRes.data } };
  }, [id, user?.id]);

  const handleSubmit = async () => {
    if (!file) {
      toast.error("Please choose a file to upload.");
      return;
    }
    setUploading(true);
    try {
      const { data: uploadData, error: uploadErr } = await uploadSubmissionFile(user.id, id, file);
      if (uploadErr) throw uploadErr;

      const isLate = data?.assignment?.deadline && new Date() > new Date(data.assignment.deadline);

      if (data?.submission) {
        const { error: updErr } = await supabase
          .from("assignment_submissions")
          .update({ file_url: uploadData.path, status: isLate ? "late" : "submitted", submitted_at: new Date().toISOString() })
          .eq("id", data.submission.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase.from("assignment_submissions").insert({
          assignment_id: id,
          student_id: user.id,
          file_url: uploadData.path,
          status: isLate ? "late" : "submitted",
        });
        if (insErr) throw insErr;
      }

      toast.success("Assignment submitted");
      setFile(null);
      refetch();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't submit your assignment."));
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async () => {
    if (!data?.submission?.file_url) return;
    const { data: url, error: err } = await getSignedUrl("assignment-submissions", data.submission.file_url);
    if (err) {
      toast.error("Couldn't open that file.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
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
      <Link to="/student/assignments" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 mb-4">
        <ArrowLeft size={15} /> Back to assignments
      </Link>

      {loading ? (
        <CardSkeleton count={1} />
      ) : !data?.assignment ? (
        <Card>
          <p className="text-sm text-ink-500 text-center py-8">Assignment not found.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="font-display text-xl font-semibold text-ink-900">{data.assignment.title}</h1>
                  <p className="text-xs text-ink-400 mt-1">
                    {data.assignment.program?.name}
                    {data.assignment.deadline && ` · Due ${format(new Date(data.assignment.deadline), "MMM d, yyyy 'at' h:mm a")}`}
                  </p>
                </div>
                <StatusBadge status={data.submission?.status || "pending"} />
              </div>
              {data.assignment.description && (
                <p className="text-sm text-ink-600 mt-4 leading-relaxed">{data.assignment.description}</p>
              )}
              {data.assignment.instructions && (
                <div className="mt-4 pt-4 border-t border-ink-100">
                  <p className="text-xs font-medium text-ink-500 mb-1.5">Instructions</p>
                  <p className="text-sm text-ink-600 leading-relaxed whitespace-pre-wrap">{data.assignment.instructions}</p>
                </div>
              )}
              <p className="text-xs text-ink-400 mt-4 pt-4 border-t border-ink-100">
                Max score: {data.assignment.max_score}
              </p>
            </Card>

            <Card title={data.submission ? "Your submission" : "Submit your work"}>
              {data.submission && (
                <div className="flex items-center gap-3 mb-4 p-3 bg-ink-50 rounded-card">
                  <FileText size={18} className="text-ink-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-800 truncate">{fileNameFromPath(data.submission.file_url)}</p>
                    <p className="text-xs text-ink-400">
                      Submitted {data.submission.submitted_at && format(new Date(data.submission.submitted_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <Download size={13} /> View
                  </Button>
                </div>
              )}

              {data.submission?.status !== "graded" ? (
                <div>
                  <div
                    className="border-2 border-dashed border-ink-200 rounded-card p-6 text-center cursor-pointer hover:border-ink-400 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadCloud size={24} className="mx-auto text-ink-400 mb-2" />
                    <p className="text-sm text-ink-600">
                      {file ? file.name : "Click to choose a file, or drag and drop"}
                    </p>
                    {file && <p className="text-xs text-ink-400 mt-1">{formatFileSize(file.size)}</p>}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button onClick={handleSubmit} disabled={uploading || !file}>
                      {uploading ? "Uploading..." : data.submission ? "Resubmit" : "Submit assignment"}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ink-500 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-good-600" /> This assignment has been graded.
                </p>
              )}
            </Card>
          </div>

          <div>
            <Card title="Grade & Feedback">
              {data.submission?.status === "graded" ? (
                <div>
                  <p className="font-display text-3xl font-semibold text-ink-900">
                    {data.submission.score}
                    <span className="text-base text-ink-400 font-body font-normal">/{data.assignment.max_score}</span>
                  </p>
                  {data.submission.feedback && (
                    <div className="mt-4 pt-4 border-t border-ink-100">
                      <p className="text-xs font-medium text-ink-500 mb-1.5">Feedback</p>
                      <p className="text-sm text-ink-600 leading-relaxed">{data.submission.feedback}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-ink-500">
                  {data.submission ? "Awaiting grading." : "Submit your work to receive a grade."}
                </p>
              )}
            </Card>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
