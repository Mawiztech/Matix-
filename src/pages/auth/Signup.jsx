import { useState } from "react";
import { Eye, EyeOff, Loader2, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import AuthCharacter from "../../components/AuthCharacter";
import PhotoSlideshow from "../../components/PhotoSlideshow";
import { supabase } from "../../lib/supabaseClient";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { friendlyError } from "../../lib/friendlyError";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SESSIONS = [
  { value: "morning", label: "Morning · 10am – 12pm" },
  { value: "afternoon", label: "Afternoon · 1pm – 3pm" },
  { value: "evening", label: "Evening · 4pm – 6pm" },
];
const DURATIONS = ["1 month", "2 months", "3 months", "6 months", "1 year"];

const emptyForm = {
  full_name: "", age: "", address: "", email: "", phone: "", whatsapp_phone: "",
  guardian_name: "", guardian_phone: "", program_id: "",
  training_days: [], training_session: "", training_duration: "",
  amount_paid: "", cost_of_training: "",
  password: "", confirm_password: "",
};

export default function Signup() {
  const { session, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [focusField, setFocusField] = useState(null);

  const mood = success ? "success"
    : error ? "error"
    : submitting ? "loading"
    : (focusField === "password" || focusField === "confirm_password") ? (showPassword ? "peeking" : "hiding")
    : focusField ? "watching"
    : "idle";

  const { data: programs, loading: programsLoading } = useSupabaseQuery(async () => {
    const { data, error } = await supabase
      .from("programs")
      .select("id, name, price, duration_weeks")
      .eq("status", "active")
      .order("name");
    return { data, error };
  }, []);

  if (!authLoading && session && profile) {
    return <Navigate to={`/${profile.role}/dashboard`} replace />;
  }

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleProgramChange = (e) => {
    const programId = e.target.value;
    const program = programs?.find((p) => p.id === programId);
    setForm((f) => ({
      ...f,
      program_id: programId,
      // Pre-fill the cost with the program's listed price; the applicant
      // can still edit it if they're paying a different agreed amount.
      cost_of_training: program ? String(program.price) : f.cost_of_training,
    }));
  };

  const toggleDay = (day) => {
    setForm((f) => {
      const has = f.training_days.includes(day);
      if (has) return { ...f, training_days: f.training_days.filter((d) => d !== day) };
      if (f.training_days.length >= 3) return f; // max 3 days per the form spec
      return { ...f, training_days: [...f.training_days, day] };
    });
  };

  const selectedProgram = programs?.find((p) => p.id === form.program_id);

  const validateStep1 = () => {
    if (!form.full_name.trim()) return "Please enter your full name.";
    if (!form.email.trim()) return "Please enter your email address.";
    if (!form.guardian_name.trim()) return "Please enter a guardian name.";
    if (!form.password || form.password.length < 8) return "Password must be at least 8 characters.";
    if (form.password !== form.confirm_password) return "Passwords don't match.";
    return "";
  };

  const validateStep2 = () => {
    if (!form.program_id) return "Please select a course.";
    if (form.training_days.length === 0) return "Please select at least one training day.";
    if (!form.training_session) return "Please select a training session.";
    if (!form.training_duration) return "Please select a training duration.";
    return "";
  };

  const goNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError("");
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validateStep2();
    if (err) { setError(err); return; }
    setError("");
    setSubmitting(true);

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            full_name: form.full_name.trim(),
            phone: form.phone.trim() || null,
          },
        },
      });
      if (signUpError) throw signUpError;

      const userId = signUpData.user?.id;
      if (!userId) {
        setSuccess(true);
        setSubmitting(false);
        return;
      }

      await supabase
        .from("students")
        .update({ address: form.address || null })
        .eq("id", userId);

      const { error: appError } = await supabase.from("enrollment_applications").insert({
        student_id: userId,
        program_id: form.program_id,
        age: form.age ? Number(form.age) : null,
        address: form.address || null,
        whatsapp_phone: form.whatsapp_phone || null,
        guardian_name: form.guardian_name.trim(),
        guardian_phone: form.guardian_phone || null,
        training_days: form.training_days,
        training_session: form.training_session,
        training_duration: form.training_duration,
        amount_paid: form.amount_paid ? Number(form.amount_paid) : 0,
        cost_of_training: form.cost_of_training ? Number(form.cost_of_training) : selectedProgram?.price ?? null,
      });
      if (appError) throw appError;

      if (!signUpData.session) {
        setSuccess(true);
        setSubmitting(false);
        return;
      }

      navigate("/student/dashboard", { replace: true });
    } catch (err) {
      setError(friendlyError(err, "We couldn't submit your enrollment. Please try again."));
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50 px-6">
        <div className="w-full max-w-sm text-center form-card-in">
          <div className="flex justify-center mb-2"><AuthCharacter mood="success" className="relative" /></div>
          <h2 className="font-display text-xl font-semibold text-ink-900">Application submitted</h2>
          <p className="mt-2 text-sm text-ink-500">
            Your account and enrollment application have been received. An
            administrator will review your application shortly. Confirm your
            email if prompted, then sign in to check your status.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-card bg-signal-600 text-white text-sm font-semibold px-4 py-2.5 hover:bg-signal-700 transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-ink-50">
      <div className="flex w-full h-40 lg:h-auto lg:w-1/2 bg-ink-950 relative overflow-hidden flex-col justify-end lg:justify-between p-5 lg:p-12">
        <PhotoSlideshow images={["/photos/slide-2.jpg", "/photos/slide-3.jpg", "/photos/slide-1.jpg"]} />
        <span className="float-b absolute top-28 right-14 h-3 w-3 rounded-full bg-gold-400/80 shadow-[0_0_14px_rgba(242,169,0,0.75)]" aria-hidden="true" />
        <span className="float-c absolute bottom-48 left-20 h-9 w-9 rounded-full border border-gold-400/40" aria-hidden="true" />
        <div className="form-badge float-a absolute top-10 right-10 flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm ring-1 ring-white/20 text-white text-xs font-medium px-3 py-1.5">
          <CheckCircle2 size={13} className="text-gold-400" /> Trusted enrollment form
        </div>
        <AuthCharacter mood={mood} transitionKey={step} className="absolute right-4 -bottom-3 scale-[0.55] origin-bottom-right lg:right-10 lg:bottom-24 lg:scale-100" />
        <div className="aurora" aria-hidden="true"><span className="orb orb-gold" /><span className="orb orb-blue" /><span className="orb orb-navy" /></div>
        <div className="relative flex items-center gap-2.5">
          <img src="/brand/logo.png" alt="MawizTech" className="h-10 w-10 object-contain float-a drop-shadow-[0_0_16px_rgba(242,169,0,0.6)]" />
          <span className="font-display font-semibold text-white text-lg tracking-tight">MawizTech</span>
        </div>
        <div className="relative max-w-md hidden lg:block">
          <p className="text-sm font-semibold text-gold-400 mb-3">Enrollment</p>
          <h1 className="font-display text-4xl font-semibold text-white leading-[1.15]">
            Empowering Africa,<br />innovating minds.
          </h1>
          <p className="mt-4 text-ink-300 text-[15px] leading-relaxed">
            Tell us about yourself and the course you'd like to join. Our team
            will review and confirm your enrollment.
          </p>
        </div>
        <p className="relative text-ink-500 text-xs font-mono hidden lg:block">© {new Date().getFullYear()} MawizTech. All rights reserved.</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg form-card-in">
          <div className="flex items-center gap-2 mb-6 mt-2 lg:mt-0">
            <div className={`h-1.5 flex-1 rounded-full overflow-hidden bg-ink-100 ${step >= 1 ? "" : ""}`}><span className={`block h-full bg-signal-600 ${step >= 1 ? "bar-grow" : "scale-x-0"} origin-left`} style={{ transform: step >= 1 ? undefined : "scaleX(0)" }} /></div>
            <div className={`h-1.5 flex-1 rounded-full overflow-hidden bg-ink-100`}><span className={`block h-full bg-signal-600 ${step >= 2 ? "bar-grow" : "scale-x-0"} origin-left`} style={{ transform: step >= 2 ? undefined : "scaleX(0)" }} /></div>
          </div>

          <h2 className="font-display text-2xl font-semibold text-ink-900">
            {step === 1 ? "Student Enrollment Form" : "Course & schedule"}
          </h2>
          <p className="mt-1.5 text-sm text-ink-500">
            {step === 1 ? "Step 1 of 2 — your details" : "Step 2 of 2 — pick your course and preferred schedule"}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4 form-stagger" key={step} noValidate>
            {error && (
              <div role="alert" className="rounded-card bg-alert-50 border border-alert-100 px-3.5 py-2.5 text-sm text-alert-700">
                {error}
              </div>
            )}

            {step === 1 && (
              <>
                <Field label="Full name" required value={form.full_name} onChange={set("full_name")} onFocus={() => setFocusField("full_name")} onBlur={() => setFocusField((f) => (f === "full_name" ? null : f))} />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Age" type="number" value={form.age} onChange={set("age")} />
                  <Field label="Email" required type="email" value={form.email} onChange={set("email")} onFocus={() => setFocusField("email")} onBlur={() => setFocusField((f) => (f === "email" ? null : f))} />
                </div>
                <Field label="Address" value={form.address} onChange={set("address")} />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Phone" type="tel" value={form.phone} onChange={set("phone")} />
                  <Field label="WhatsApp phone" type="tel" value={form.whatsapp_phone} onChange={set("whatsapp_phone")} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Guardian name" required value={form.guardian_name} onChange={set("guardian_name")} />
                  <Field label="Guardian phone" type="tel" value={form.guardian_phone} onChange={set("guardian_phone")} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <Field label="Password" required type={showPassword ? "text" : "password"} value={form.password} onChange={set("password")} placeholder="At least 8 characters" onFocus={() => setFocusField("password")} onBlur={() => setFocusField((f) => (f === "password" ? null : f))} />
                    <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-[34px] text-ink-400 hover:text-ink-600">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <Field label="Confirm password" required type={showPassword ? "text" : "password"} value={form.confirm_password} onChange={set("confirm_password")} onFocus={() => setFocusField("confirm_password")} onBlur={() => setFocusField((f) => (f === "confirm_password" ? null : f))} />
                </div>

                <button
                  type="button"
                  onClick={goNext}
                  className="w-full flex items-center justify-center gap-2 rounded-card bg-signal-600 text-white text-sm font-semibold py-2.5 hover:bg-signal-700 transition-colors"
                >
                  Continue <ChevronRight size={16} />
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">
                    Course / Program <span className="text-alert-500">*</span>
                  </label>
                  <select
                    value={form.program_id}
                    onChange={handleProgramChange}
                    className="w-full rounded-card border border-ink-200 bg-white px-3.5 py-3 text-sm text-ink-900 focus:border-signal-600 focus:ring-4 focus:ring-signal-600/10 outline-none transition-colors bg-white"
                    disabled={programsLoading}
                  >
                    <option value="">{programsLoading ? "Loading courses..." : "Select a course"}</option>
                    {programs?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ₦{Number(p.price).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">
                    Training days <span className="text-alert-500">*</span> <span className="text-ink-400 font-normal">(choose up to 3)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {DAYS.map((day) => (
                      <button
                        type="button"
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`text-xs font-medium py-2 rounded-card border transition-colors ${
                          form.training_days.includes(day)
                            ? "bg-ink-900 text-white border-ink-900"
                            : "bg-white text-ink-600 border-ink-300 hover:border-ink-500"
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">
                    Training session <span className="text-alert-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {SESSIONS.map((s) => (
                      <label key={s.value} className="flex items-center gap-2.5 text-sm text-ink-700 cursor-pointer">
                        <input
                          type="radio"
                          name="session"
                          value={s.value}
                          checked={form.training_session === s.value}
                          onChange={set("training_session")}
                          className="accent-signal-600"
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">
                    Training duration <span className="text-alert-500">*</span>
                  </label>
                  <select
                    value={form.training_duration}
                    onChange={set("training_duration")}
                    className="w-full rounded-card border border-ink-200 bg-white px-3.5 py-3 text-sm text-ink-900 focus:border-signal-600 focus:ring-4 focus:ring-signal-600/10 outline-none transition-colors bg-white"
                  >
                    <option value="">Select duration</option>
                    {DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Cost of training"
                    type="number"
                    value={form.cost_of_training}
                    onChange={set("cost_of_training")}
                    placeholder={selectedProgram ? String(selectedProgram.price) : "Select a course first"}
                  />
                  <Field label="Amount paid" type="number" value={form.amount_paid} onChange={set("amount_paid")} placeholder="0" />
                </div>
                <p className="text-xs text-ink-400 -mt-2">
                  Cost fills in automatically from your selected course, but you can edit it. Payment is confirmed by our team after review.
                </p>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex items-center justify-center gap-1.5 rounded-card border border-ink-300 text-ink-700 text-sm font-medium px-4 py-2.5 hover:bg-ink-50 transition-colors"
                  >
                    <ChevronLeft size={16} /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 rounded-card bg-signal-600 text-white text-sm font-semibold py-2.5 hover:bg-signal-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting && <Loader2 size={16} className="animate-spin" />}
                    {submitting ? "Submitting..." : "Submit application"}
                  </button>
                </div>
              </>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-ink-800 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, className = "", ...props }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-ink-700 mb-1.5">
        {label} {required && <span className="text-alert-500">*</span>}
      </label>
      <input
        {...props}
        className="w-full rounded-card border border-ink-200 bg-white px-3.5 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-signal-600 focus:ring-4 focus:ring-signal-600/10 outline-none transition-colors"
      />
    </div>
  );
}
