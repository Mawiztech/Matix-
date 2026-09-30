import { useEffect } from "react";
import { Link } from "react-router-dom";
import PhotoSlideshow from "../components/PhotoSlideshow";
import {
  ClipboardCheck, TrendingUp, FileText, Bell, ShieldCheck, Users,
  GraduationCap, UserCog, ArrowRight, Check,
} from "lucide-react";

const roles = [
  {
    icon: GraduationCap,
    label: "Students",
    copy: "See your program, attendance, assignments and grades the moment they're recorded — no waiting on an email.",
  },
  {
    icon: Users,
    label: "Facilitators",
    copy: "Mark attendance, grade submissions and track your students' progress without leaving the session.",
  },
  {
    icon: UserCog,
    label: "Administrators",
    copy: "Run enrollments, payments and every program from one place, with a full record of who did what.",
  },
];

const capabilities = [
  {
    icon: ClipboardCheck,
    title: "Attendance, taken once",
    copy: "Facilitators mark a session and it's on the record — visible to the student and counted toward their standing immediately.",
  },
  {
    icon: FileText,
    title: "Assignments in one place",
    copy: "Submit, grade and comment without a shared drive full of file names like \"final_v3_ACTUAL.docx\".",
  },
  {
    icon: TrendingUp,
    title: "Progress you can see",
    copy: "Grades, project marks and conduct roll up into one progress view — for the student and for the program.",
  },
  {
    icon: Bell,
    title: "Notified, not chased",
    copy: "A new assignment, a graded submission, a schedule change — it reaches you the moment it happens.",
  },
  {
    icon: ShieldCheck,
    title: "Your data, your rows only",
    copy: "Row-level security on every table means a student sees their own records, a facilitator sees their own cohort — enforced by the database, not just the interface.",
  },
];

const steps = [
  { n: "1", title: "Apply", copy: "Create a student account and choose your program — training days, session time and duration." },
  { n: "2", title: "Get enrolled", copy: "An administrator confirms your enrollment and payment status, and you're on the roster." },
  { n: "3", title: "Track everything", copy: "Attendance, assignments, grades and progress update in your dashboard as training happens." },
];

function PortalPreview() {
  const rows = [
    { t: "Python basics quiz", s: "Graded · 86%", tone: "bg-good-500/15 text-good-100 ring-good-500/30" },
    { t: "Portfolio project", s: "Awaiting grade", tone: "bg-gold-500/15 text-gold-300 ring-gold-500/30" },
    { t: "Networking lab", s: "Due Friday", tone: "bg-white/10 text-ink-200 ring-white/15" },
  ];
  return (
    <div className="relative float-slow">
      <div className="float-a absolute -left-3 sm:-left-8 -top-5 z-10 flex items-center gap-2 rounded-full bg-good-500 text-white text-xs font-semibold px-3.5 py-2 shadow-[0_0_28px_rgba(31,138,95,0.65)]"><Check size={14} /> Attendance recorded</div>
      <div className="float-b absolute -right-2 sm:-right-6 top-1/2 z-10 rounded-card bg-white text-ink-900 text-xs font-semibold px-3.5 py-2.5 shadow-lift">New grade: <span className="text-good-600">86%</span></div>
      <div className="float-c absolute -bottom-5 left-8 z-10 flex items-center gap-2 rounded-full bg-gold-500 text-signal-700 text-xs font-semibold px-3.5 py-2 shadow-[0_0_28px_rgba(242,169,0,0.65)]"><Bell size={14} /> Session moved to 10:00</div>
    <div className="glow-border relative rounded-[20px] bg-ink-900/55 backdrop-blur-xl ring-1 ring-white/15 shadow-pop p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-semibold text-white">Student dashboard</p>
        <span className="text-[11px] text-ink-300 rounded-full bg-white/10 px-2.5 py-0.5">Sample data</span>
      </div>
      <div className="mt-5 flex items-center gap-5 rounded-card bg-white/[0.06] ring-1 ring-white/10 p-4">
        <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90 shrink-0" aria-hidden="true">
          <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="7" />
          <circle cx="32" cy="32" r="26" fill="none" stroke="#F2A900" strokeWidth="7" className="ring-draw" strokeLinecap="round" strokeDasharray="163.4" strokeDashoffset="13" />
        </svg>
        <div>
          <p className="font-display text-2xl font-semibold text-white leading-none">92%</p>
          <p className="text-sm text-ink-300 mt-1.5">Attendance · 23 of 25 sessions</p>
        </div>
      </div>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li key={r.t} className="flex items-center justify-between gap-3 rounded-card bg-white/[0.04] px-4 py-3">
            <span className="text-sm text-white">{r.t}</span>
            <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ring-1 ring-inset whitespace-nowrap ${r.tone}`}>{r.s}</span>
          </li>
        ))}
      </ul>
    </div>
    </div>
  );
}

export default function Home() {
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.15 });
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return (
    <div className="bg-ink-50">
      <header className="relative overflow-hidden bg-ink-950">
        <PhotoSlideshow />
        <div className="aurora" aria-hidden="true"><span className="orb orb-gold" /><span className="orb orb-blue" /><span className="orb orb-navy" /></div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />
        <div className="relative max-w-6xl mx-auto px-6 lg:px-8 pt-8 pb-20 lg:pb-28">
          <nav className="flex items-center justify-between mb-16 lg:mb-24">
            <div className="flex items-center gap-2.5">
              <img src="/brand/logo.png" alt="MawizTech" className="h-9 w-9 object-contain" />
              <span className="font-display font-semibold text-white text-lg">MawizTech</span>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/login" className="text-sm font-medium text-ink-300 hover:text-white transition-colors px-3 py-2">Sign in</Link>
              <Link to="/signup" className="text-sm font-semibold text-white rounded-full bg-white/10 ring-1 ring-white/25 hover:bg-white/20 px-4 py-2 transition-colors btn-lift">Apply now</Link>
            </div>
          </nav>
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-12 items-center">
            <div className="hero-copy">
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-semibold text-white leading-[1.06] text-balance">
                Your training, tracked end to end.
              </h1>
              <p className="text-ink-300 text-base sm:text-lg leading-relaxed mt-6 max-w-md">
                One portal for students, facilitators and administrators: attendance, assignments, grades and progress, in the place training actually happens.
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-9">
                <Link to="/signup" className="inline-flex items-center gap-2 text-sm font-semibold rounded-full px-6 py-3.5 transition-all btn-lift shine glow-pulse bg-gradient-to-b from-gold-400 to-gold-500 text-signal-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_28px_-8px_rgba(242,169,0,0.65)] hover:from-gold-300 hover:to-gold-400">
                  Apply as a student <ArrowRight size={16} />
                </Link>
                <Link to="/login" className="inline-flex items-center text-sm font-medium text-white rounded-full ring-1 ring-white/25 hover:ring-white/50 px-6 py-3.5 transition-all">
                  Sign in to your portal
                </Link>
              </div>
            </div>
            <PortalPreview />
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 lg:px-8 py-20 lg:py-24">
        <div className="grid md:grid-cols-3 gap-5">
          {roles.map((r) => (
            <div key={r.label} data-reveal className="reveal card-hover relative bg-white rounded-card p-7 shadow-card ring-1 ring-ink-200/70">
              <span className="absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-gold-500 to-transparent" />
              <div className="h-11 w-11 rounded-card bg-gradient-to-br from-signal-500 to-signal-700 text-gold-400 ring-1 ring-inset ring-white/10 flex items-center justify-center">
                <r.icon size={19} strokeWidth={2} />
              </div>
              <h3 className="font-display text-lg font-semibold text-ink-900 mt-5">{r.label}</h3>
              <p className="text-sm text-ink-500 leading-relaxed mt-2">{r.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 lg:px-8 pb-20 lg:pb-24">
        <h2 data-reveal className="reveal font-display text-3xl sm:text-4xl font-semibold text-ink-900 leading-tight max-w-xl text-balance">
          Everything a training program needs, nothing it doesn't.
        </h2>
        <div className="grid lg:grid-cols-3 gap-5 mt-12">
          {capabilities.map((c, i) => {
            const feature = i === 0;
            return (
              <div
                key={c.title}
                data-reveal
                className={feature
                  ? "reveal card-hover lg:col-span-2 relative overflow-hidden rounded-card bg-gradient-to-br from-signal-600 to-ink-950 p-8 shadow-lift"
                  : "reveal card-hover rounded-card bg-white p-7 shadow-card ring-1 ring-ink-200/70"}
              >
                {feature && <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold-500/20 blur-3xl" />}
                <div className={`relative h-10 w-10 rounded-card flex items-center justify-center ${feature ? "bg-gold-500 text-signal-700" : "bg-signal-50 text-signal-600"}`}>
                  <c.icon size={18} strokeWidth={2} />
                </div>
                <h3 className={`relative font-display font-semibold mt-5 ${feature ? "text-2xl text-white" : "text-base text-ink-900"}`}>{c.title}</h3>
                <p className={`relative leading-relaxed mt-2 ${feature ? "text-ink-300 max-w-md" : "text-sm text-ink-500"}`}>{c.copy}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white border-y border-ink-200/70">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-20 lg:py-24">
          <h2 className="font-display text-3xl sm:text-4xl font-semibold text-ink-900">Getting started as a student</h2>
          <div className="relative grid md:grid-cols-3 gap-10 mt-14">
            <div className="hidden md:block absolute left-0 right-0 top-5 h-px bg-gradient-to-r from-gold-500 via-ink-200 to-ink-200" />
            {steps.map((s) => (
              <div key={s.n} data-reveal className="reveal relative">
                <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-signal-600 text-gold-400 font-display font-semibold glow-pulse ring-4 ring-white">{s.n}</span>
                <h3 className="font-display text-lg font-semibold text-ink-900 mt-5">{s.title}</h3>
                <p className="text-sm text-ink-500 leading-relaxed mt-2 max-w-xs">{s.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 lg:px-8 py-20 lg:py-24">
        <div data-reveal className="reveal glow-border relative overflow-hidden rounded-[28px] bg-ink-950 ring-1 ring-gold-500/30 px-8 py-16 text-center">
          <div className="absolute left-1/2 -top-24 h-56 w-[28rem] -translate-x-1/2 rounded-full bg-gold-500/20 blur-3xl" />
          <h2 className="relative font-display text-3xl sm:text-4xl font-semibold text-white max-w-lg mx-auto leading-tight text-balance">
            Ready to see your training in one place?
          </h2>
          <div className="relative flex flex-wrap items-center justify-center gap-3 mt-9">
            <Link to="/signup" className="inline-flex items-center gap-2 text-sm font-semibold rounded-full px-6 py-3.5 transition-all btn-lift shine glow-pulse bg-gradient-to-b from-gold-400 to-gold-500 text-signal-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_28px_-8px_rgba(242,169,0,0.65)] hover:from-gold-300 hover:to-gold-400">
              Apply as a student <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="inline-flex items-center text-sm font-medium text-white rounded-full ring-1 ring-white/25 hover:ring-white/50 px-6 py-3.5 transition-all">
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-ink-950">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/brand/logo.png" alt="MawizTech" className="h-7 w-7 object-contain" />
            <div>
              <p className="font-display font-semibold text-white text-sm">MawizTech</p>
              <p className="text-xs text-ink-400">Empowering Africa, Innovating Minds</p>
            </div>
          </div>
          <p className="text-xs text-ink-400">Owerri, Imo State, Nigeria · © {new Date().getFullYear()} MawizTech</p>
        </div>
      </footer>
    </div>
  );
}
