import { useEffect, useState } from "react";

function useCountUp(value) {
  const m = typeof value === "string" ? value.match(/^(\d+(?:\.\d+)?)(%?)$/) : null;
  const target = typeof value === "number" ? value : m ? parseFloat(m[1]) : null;
  const suffix = m ? m[2] : "";
  const still = false;
  const [n, setN] = useState(0);
  useEffect(() => {
    if (target == null || still) return;
    let raf, t0;
    const step = (t) => {
      t0 = t0 ?? t;
      const p = Math.min(1, (t - t0) / 900);
      setN(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, still]);
  if (target == null || still) return value;
  return `${n.toFixed(Number.isInteger(target) ? 0 : 1)}${suffix}`;
}

export function StatCard({ label, value, icon: Icon, accent = "ink", sub }) {
  const shown = useCountUp(value);
  const accentMap = {
    ink: "bg-ink-900 text-ink-50",
    signal: "bg-gradient-to-br from-signal-500 to-signal-700 text-white",
    good: "bg-gradient-to-br from-good-500 to-good-700 text-white",
    alert: "bg-gradient-to-br from-alert-500 to-alert-700 text-white",
    warn: "bg-gradient-to-br from-warn-500 to-warn-700 text-white",
    emerald: "bg-gradient-to-br from-good-500 to-good-700 text-white",
    amber: "bg-gradient-to-br from-gold-400 to-gold-600 text-signal-700",
    rose: "bg-gradient-to-br from-alert-500 to-alert-700 text-white",
  };
  return (
    <div className="group bg-white rounded-card border border-ink-200/70 p-5 shadow-card card-hover">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-500 leading-snug">{label}</p>
          <p className="font-display text-[28px] leading-none font-semibold text-ink-900 mt-2.5 tabular-nums tracking-tight">{shown}</p>
          {sub && <p className="text-xs text-ink-400 mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className={`h-9 w-9 rounded-card flex items-center justify-center shrink-0 shadow-[0_8px_20px_-6px_rgba(11,37,69,0.55)] ring-1 ring-inset ring-white/15 ${accentMap[accent] || accentMap.ink}`}>
            <Icon size={17} strokeWidth={2} />
          </div>
        )}
      </div>
    </div>
  );
}

export function PageHeader({ title, description, action }) {
  return (
    <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6 pb-5 border-b border-ink-200">
      <div>
        <h1 className="font-display text-2xl sm:text-[28px] font-semibold text-ink-900 leading-tight tracking-tight">{title}</h1>
        {description && <p className="text-sm text-ink-500 mt-1.5 max-w-xl">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
      <span className="absolute -bottom-px left-0 h-0.5 w-16 bg-gradient-to-r from-gold-500 to-gold-300" />
    </div>
  );
}

// Status tags read as small solid marks, not soft pastel pills — deliberately
// closer to a spec sheet's stamped status than a chat-app badge.
const STATUS_STYLES = {
  active: "bg-good-50 text-good-700 ring-1 ring-inset ring-good-500/30",
  present: "bg-good-50 text-good-700 ring-1 ring-inset ring-good-500/30",
  paid: "bg-good-50 text-good-700 ring-1 ring-inset ring-good-500/30",
  published: "bg-good-50 text-good-700 ring-1 ring-inset ring-good-500/30",
  completed: "bg-good-50 text-good-700 ring-1 ring-inset ring-good-500/30",
  graded: "bg-good-50 text-good-700 ring-1 ring-inset ring-good-500/30",
  approved: "bg-good-50 text-good-700 ring-1 ring-inset ring-good-500/30",
  passed: "bg-good-50 text-good-700 ring-1 ring-inset ring-good-500/30",

  pending: "bg-warn-50 text-warn-700 ring-1 ring-inset ring-warn-500/30",
  partial: "bg-warn-50 text-warn-700 ring-1 ring-inset ring-warn-500/30",
  draft: "bg-ink-100 text-ink-600 ring-1 ring-inset ring-ink-300",
  submitted: "bg-warn-50 text-warn-700 ring-1 ring-inset ring-warn-500/30",
  late: "bg-warn-50 text-warn-700 ring-1 ring-inset ring-warn-500/30",
  in_progress: "bg-warn-50 text-warn-700 ring-1 ring-inset ring-warn-500/30",
  assigned: "bg-ink-100 text-ink-600 ring-1 ring-inset ring-ink-300",
  minor: "bg-warn-50 text-warn-700 ring-1 ring-inset ring-warn-500/30",
  reviewed: "bg-signal-50 text-signal-600 ring-1 ring-inset ring-signal-300/40",

  inactive: "bg-ink-100 text-ink-500 ring-1 ring-inset ring-ink-200",
  suspended: "bg-alert-50 text-alert-700 ring-1 ring-inset ring-alert-500/30",
  withdrawn: "bg-alert-50 text-alert-700 ring-1 ring-inset ring-alert-500/30",
  absent: "bg-alert-50 text-alert-700 ring-1 ring-inset ring-alert-500/30",
  refunded: "bg-ink-100 text-ink-500 ring-1 ring-inset ring-ink-200",
  closed: "bg-ink-100 text-ink-500 ring-1 ring-inset ring-ink-200",
  archived: "bg-ink-100 text-ink-500 ring-1 ring-inset ring-ink-200",
  rejected: "bg-alert-50 text-alert-700 ring-1 ring-inset ring-alert-500/30",
  not_passed: "bg-alert-50 text-alert-700 ring-1 ring-inset ring-alert-500/30",
  major: "bg-alert-50 text-alert-700 ring-1 ring-inset ring-alert-500/30",
  critical: "bg-alert-50 text-alert-700 ring-1 ring-inset ring-alert-500/30",
  excused: "bg-ink-100 text-ink-500 ring-1 ring-inset ring-ink-200",
  note: "bg-ink-100 text-ink-600 ring-1 ring-inset ring-ink-200",
};

export function StatusBadge({ status }) {
  if (!status) return null;
  const key = String(status).toLowerCase();
  const style = STATUS_STYLES[key] || "bg-ink-200 text-ink-700";
  const label = key.replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${style}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {label}
    </span>
  );
}

export function Card({ title, action, children, className = "" }) {
  return (
    <div className={`bg-white rounded-card border border-ink-200/70 card-glow shadow-card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-ink-200">
          {title && <h3 className="font-display text-[15px] font-semibold text-ink-900">{title}</h3>}
          {action}
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

export function ProgressBar({ percentage = 0, colorClass = "bg-signal-600" }) {
  const pct = Math.max(0, Math.min(100, percentage));
  return (
    <div className="w-full h-2 bg-ink-100 rounded-full overflow-hidden">
      <div className={`h-full ${colorClass} rounded-full transition-all bar-grow`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Input({ label, error, className = "", ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-ink-700 mb-1.5">{label}</label>}
      <input
        {...props}
        className="w-full rounded-card border border-ink-200 bg-white px-3.5 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-signal-600 focus:ring-4 focus:ring-signal-600/10 outline-none transition-colors disabled:bg-ink-100 disabled:text-ink-400"
      />
      {error && <p className="text-xs text-alert-600 mt-1">{error}</p>}
    </div>
  );
}

export function Select({ label, error, className = "", children, ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-ink-700 mb-1.5">{label}</label>}
      <select
        {...props}
        className="w-full rounded-card border border-ink-200 bg-white px-3.5 py-3 text-sm text-ink-900 focus:border-signal-600 focus:ring-4 focus:ring-signal-600/10 outline-none transition-colors bg-white disabled:bg-ink-100 disabled:text-ink-400"
      >
        {children}
      </select>
      {error && <p className="text-xs text-alert-600 mt-1">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, className = "", ...props }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-ink-700 mb-1.5">{label}</label>}
      <textarea
        {...props}
        className="w-full rounded-card border border-ink-200 bg-white px-3.5 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-signal-600 focus:ring-4 focus:ring-signal-600/10 outline-none transition-colors disabled:bg-ink-100 disabled:text-ink-400"
      />
      {error && <p className="text-xs text-alert-600 mt-1">{error}</p>}
    </div>
  );
}

export function Button({ variant = "primary", size = "md", className = "", children, ...props }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-card font-semibold transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed btn-lift";
  const sizes = { sm: "text-xs px-3 py-1.5", md: "text-sm px-4 py-2.5", lg: "text-sm px-5 py-3" };
  const variants = {
    primary: "bg-gradient-to-b from-signal-500 to-signal-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(6,14,31,0.3)] hover:from-signal-400 hover:to-signal-600 shine",
    accent: "bg-gradient-to-b from-gold-400 to-gold-500 text-signal-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_8px_20px_-8px_rgba(242,169,0,0.6)] hover:from-gold-300 hover:to-gold-400 shine",
    dark: "bg-ink-900 text-white shadow-sm hover:bg-ink-800 hover:shadow-md",
    secondary: "bg-ink-100 text-ink-800 hover:bg-ink-200",
    outline: "border border-ink-300 text-ink-700 hover:border-ink-500 hover:bg-ink-50",
    danger: "bg-alert-600 text-white shadow-sm hover:bg-alert-700 hover:shadow-md",
    ghost: "text-ink-600 hover:bg-ink-100",
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Modal({ open, onClose, title, children, footer, size = "md" }) {
  if (!open) return null;
  const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };
  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-ink-950/60 backdrop-blur-sm fade-in p-0 sm:p-4">
      <div className={`modal-in w-full ${sizes[size]} bg-white rounded-t-card sm:rounded-card shadow-pop max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink-200 shrink-0">
          <h3 className="font-display text-base font-semibold text-ink-900">{title}</h3>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-900 text-xl leading-none w-7 h-7 flex items-center justify-center rounded-block hover:bg-ink-100 transition-colors">×</button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-ink-200 flex justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
