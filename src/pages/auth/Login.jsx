import { useState } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import AuthCharacter from "../../components/AuthCharacter";
import PhotoSlideshow from "../../components/PhotoSlideshow";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useLocation, Navigate, Link } from "react-router-dom";
import { friendlyError } from "../../lib/friendlyError";

export default function Login() {
  const { signIn, session, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [focusField, setFocusField] = useState(null);

  const mood = error ? "error"
    : submitting ? "loading"
    : focusField === "password" ? (showPassword ? "peeking" : "hiding")
    : focusField === "email" ? "watching"
    : "idle";

  // Already signed in — send to the right dashboard.
  if (!authLoading && session && profile) {
    const dest = location.state?.from?.pathname || `/${profile.role}/dashboard`;
    return <Navigate to={dest} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setSubmitting(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setSubmitting(false);

    if (signInError) {
      setError(friendlyError(signInError, "We couldn't sign you in. Please try again."));
      return;
    }
    // Role-based redirect happens automatically once profile loads via the guard above.
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-ink-50">
      {/* Brand panel */}
      <div className="flex w-full h-40 lg:h-auto lg:w-1/2 bg-ink-950 relative overflow-hidden flex-col justify-end lg:justify-between p-5 lg:p-12">
        <PhotoSlideshow images={["/photos/slide-2.jpg", "/photos/slide-3.jpg", "/photos/slide-1.jpg"]} />
        <div className="aurora" aria-hidden="true"><span className="orb orb-gold" /><span className="orb orb-blue" /><span className="orb orb-navy" /></div>
        <span className="float-b absolute top-28 right-14 h-3 w-3 rounded-full bg-gold-400/80 shadow-[0_0_14px_rgba(242,169,0,0.75)]" aria-hidden="true" />
        <span className="float-c absolute bottom-48 left-20 h-9 w-9 rounded-full border border-gold-400/40" aria-hidden="true" />
        <span className="float-a absolute top-1/3 left-10 h-2 w-2 rounded-full bg-white/50" aria-hidden="true" />
        <div className="form-badge float-a absolute top-10 right-10 flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm ring-1 ring-white/20 text-white text-xs font-medium px-3 py-1.5">
          <ShieldCheck size={13} className="text-gold-400" /> Secure student login
        </div>
        <AuthCharacter mood={mood} className="absolute right-4 -bottom-3 scale-[0.55] origin-bottom-right lg:right-10 lg:bottom-24 lg:scale-100" />
        <div className="relative flex items-center gap-2.5">
          <img src="/brand/logo.png" alt="MawizTech" className="h-10 w-10 object-contain float-a drop-shadow-[0_0_16px_rgba(242,169,0,0.6)]" />
          <span className="font-display font-semibold text-white text-lg tracking-tight">MawizTech</span>
        </div>
        <div className="relative max-w-md hidden lg:block">
          <p className="text-sm font-semibold text-gold-400 mb-3">Student Portal</p>
          <h1 className="font-display text-4xl font-semibold text-white leading-[1.15]">
            Your training,<br />tracked end to end.
          </h1>
          <p className="mt-4 text-ink-300 text-[15px] leading-relaxed">
            Attendance, assignments, grades and progress — one portal for
            students, facilitators and administrators.
          </p>
        </div>
        <p className="relative text-ink-500 text-xs font-mono hidden lg:block">© {new Date().getFullYear()} MawizTech. All rights reserved.</p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm form-card-in">
          <h2 className="font-display text-2xl font-semibold text-ink-900">Sign in</h2>
          <p className="mt-1.5 text-sm text-ink-500">Enter your credentials to access your portal.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4 form-stagger" noValidate>
            {error && (
              <div role="alert" className="rounded-card bg-alert-50 border border-alert-100 px-3.5 py-2.5 text-sm text-alert-700">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusField("email")}
                onBlur={() => setFocusField((f) => (f === "email" ? null : f))}
                className="w-full rounded-card border border-ink-200 bg-white px-3.5 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-signal-600 focus:ring-4 focus:ring-signal-600/10 outline-none transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusField("password")}
                  onBlur={() => setFocusField((f) => (f === "password" ? null : f))}
                  className="w-full rounded-card border border-ink-200 bg-white px-3.5 py-3 pr-11 text-sm text-ink-900 placeholder:text-ink-400 focus:border-signal-600 focus:ring-4 focus:ring-signal-600/10 outline-none transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-card bg-gradient-to-b from-gold-400 to-gold-500 text-signal-700 text-sm font-semibold py-3 shine glow-pulse hover:from-gold-300 disabled:opacity-60 disabled:cursor-not-allowed btn-lift"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-ink-500">
            New here?{" "}
            <Link to="/signup" className="font-medium text-ink-800 hover:underline">
              Create a student account
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-ink-400">
            Having trouble signing in? Contact your program administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
