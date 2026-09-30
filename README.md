# MawizTech Student Portal

A production student management portal for MawizTech, built against the
existing Supabase project `mawiztech-student-portal`. Three role-based
dashboards — Student, Facilitator, Admin — all backed by real data and
Row Level Security. No demo/mock data anywhere in the app.

## Stack

- React 19 + Vite
- React Router v7 (role-gated routes, lazy-loaded pages)
- Tailwind CSS
- Supabase JS (`@supabase/supabase-js`) — Auth, Postgres, Storage
- react-hot-toast for notifications

## Getting started

```bash
npm install
npm run dev       # local dev server
npm run build      # production build → dist/
npm run preview    # preview the production build locally
```

## Environment variables

Copy `.env` (already included) or create your own:

```
VITE_SUPABASE_URL=https://spwbohjxkcjriogflsmy.supabase.co
VITE_SUPABASE_ANON_KEY=<the anon/publishable key — safe for the browser>
```

**Never** put the Supabase **service-role** key in this project. It is not
needed anywhere in the frontend — privileged operations (creating
facilitator/admin/student accounts, resetting passwords, deleting users) go
through Supabase Edge Functions / RPCs that already exist on the project and
hold the service-role key server-side only:

- `admin-users` (Edge Function) — create-user (any role), reset-password, delete-user
- `create-privileged-user` (Edge Function) — create facilitator/admin accounts
- `set_user_role` (Postgres RPC, SECURITY DEFINER) — admin-gated role changes

The frontend calls these via `supabase.functions.invoke(...)` /
`supabase.rpc(...)` using the caller's own session token. It never touches
the service-role key, and creating another user's account never replaces
the admin's own browser session (a plain `auth.signUp()` call would do
that — this app deliberately avoids it for anyone other than the person
signing themselves up).

## Project structure

```
src/
  lib/            Supabase client, storage helpers, friendly error mapper
  context/        Auth context (session + profile/role), confirm dialogs
  hooks/          useSupabaseQuery (loading/error/retry), debounce
  components/     Shared UI kit, DataTable, DashboardLayout, notification bell
  pages/
    auth/         Login
    student/      13 pages
    facilitator/  15 pages
    admin/        16 pages
```

Every data page follows the same pattern: loading skeleton → data / empty
state / error state with retry. Tables collapse to stacked cards on mobile.

## Database

This app does **not** create or modify schema. It reads the existing
Supabase project's tables (`profiles`, `students`, `facilitators`, `admins`,
`programs`, `facilitator_programs`, `enrollments`, `payments`, `attendance`,
`training_sessions`, `assignments`, `assignment_submissions`, `progress`,
`projects`, `professional_conduct`, `final_grades`, `grading_config`,
`grade_scale`, `resources`, `notifications`, `notification_recipients`,
`custom_program_requests`) and respects the existing RLS policies on all of
them. If a query returns nothing, that's RLS doing its job — the UI shows a
proper empty state rather than inventing data.

### Storage buckets (existing, RLS-protected)

- `assignment-submissions/{student_id}/...` — private
- `resources/{program_id or "general"}/...` — private, signed URLs used to view/download
- `student-documents/{student_id}/...` — private
- `avatars/{user_id}/...` — public

## Roles & routing

- `/student/dashboard`, `/facilitator/dashboard`, `/admin/dashboard` are
  guarded by `ProtectedRoute`, which checks the authenticated session and the
  profile's `role` column. Visiting another role's URL redirects to your own
  dashboard — it never exposes a blank/broken page.
- Unauthenticated visitors are redirected to `/login`.
- Sessions persist via Supabase Auth's built-in session storage
  (`persistSession: true`, `autoRefreshToken: true`).

## Deploying

This is a static Vite build — deploy `dist/` to any static host (Vercel,
Netlify, Cloudflare Pages, S3+CloudFront, etc.). Set the two `VITE_*`
environment variables in your host's dashboard; do not commit `.env` with
real values to a public repo (it's already gitignored here).

## Testing checklist

Walk through each role and confirm:

- Login (valid/invalid credentials, show/hide password, loading state)
- Correct dashboard redirect per role, and that typing another role's URL
  redirects you back to your own dashboard
- Every page's loading, empty, and error+retry states render correctly
- A student cannot see another student's data; a facilitator cannot see
  students/programs outside their assignments — this is enforced by RLS at
  the database level, so the frontend simply reflects whatever the database
  allows through
- File upload/download for assignment submissions and resources
- Notification bell unread count and mark-as-read
- Logout, with a confirmation dialog
