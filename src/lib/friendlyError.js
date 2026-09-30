/**
 * Translates Supabase / PostgREST / Auth errors into short, friendly,
 * non-technical messages. Never surfaces raw error codes or stack traces.
 */
export function friendlyError(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;

  const msg = (error.message || "").toLowerCase();
  const code = error.code || "";

  if (msg.includes("invalid login credentials")) {
    return "That email or password isn't right. Please try again.";
  }
  if (msg.includes("email not confirmed")) {
    return "Please confirm your email address before signing in.";
  }
  if (msg.includes("failed to fetch") || msg.includes("network")) {
    return "We couldn't reach the server. Check your connection and try again.";
  }
  if (msg.includes("jwt expired") || msg.includes("refresh_token_not_found")) {
    return "Your session has expired. Please sign in again.";
  }
  if (code === "23505" || msg.includes("duplicate key")) {
    return "That record already exists.";
  }
  if (code === "23503" || msg.includes("foreign key")) {
    return "This action can't be completed because related information is missing.";
  }
  if (code === "23514" || msg.includes("check constraint")) {
    return "One of the values entered isn't valid. Please review and try again.";
  }
  if (code === "42501" || msg.includes("permission denied") || msg.includes("row-level security")) {
    return "You don't have permission to do that.";
  }
  if (msg.includes("not found") || code === "PGRST116") {
    return "We couldn't find that record.";
  }
  if (msg.includes("payload too large")) {
    return "That file is too large to upload.";
  }

  return fallback;
}
