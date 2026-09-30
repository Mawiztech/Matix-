import { supabase } from "./supabaseClient";

/**
 * Folder conventions are enforced by Supabase Storage RLS policies:
 * - assignment-submissions/{student_id}/{filename}
 * - resources/{program_id}/{filename}  OR  resources/general/{filename}
 * - student-documents/{student_id}/{filename}
 * - avatars/{user_id}/{filename}
 */

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

export async function uploadSubmissionFile(studentId, assignmentId, file) {
  const path = `${studentId}/${assignmentId}-${Date.now()}-${sanitizeFileName(file.name)}`;
  const { data, error } = await supabase.storage
    .from("assignment-submissions")
    .upload(path, file, { upsert: false });
  if (error) return { error };
  return { data: { path: data.path } };
}

export async function uploadResourceFile(programIdOrGeneral, file) {
  const folder = programIdOrGeneral || "general";
  const path = `${folder}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { data, error } = await supabase.storage.from("resources").upload(path, file, { upsert: false });
  if (error) return { error };
  return { data: { path: data.path } };
}

export async function uploadAvatarFile(userId, file) {
  const path = `${userId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { data, error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) return { error };
  const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
  return { data: { path: data.path, publicUrl: publicUrl.publicUrl } };
}

/** For private buckets, generate a short-lived signed URL for download/view. */
export async function getSignedUrl(bucket, path, expiresInSeconds = 3600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
  if (error) return { error };
  return { data: data.signedUrl };
}

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileNameFromPath(path) {
  if (!path) return "";
  const parts = path.split("/");
  return parts[parts.length - 1];
}
