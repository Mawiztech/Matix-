import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="animate-pulse">
      <div className="hidden md:block">
        <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-3 bg-ink-100 rounded" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid gap-3 mb-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-8 bg-ink-50 rounded" />
            ))}
          </div>
        ))}
      </div>
      <div className="md:hidden space-y-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="h-20 bg-ink-50 rounded-card border border-ink-100" />
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 3 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-32 bg-ink-50 rounded-card border border-ink-100" />
      ))}
    </div>
  );
}

export function StatSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-24 bg-ink-50 rounded-card border border-ink-100" />
      ))}
    </div>
  );
}

export function EmptyState({
  title = "Nothing here yet",
  description,
  icon: Icon = Inbox,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-4">
      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-signal-50 to-gold-50 float-a flex items-center justify-center mb-4 ring-1 ring-inset ring-gold-300/50 shadow-[0_10px_30px_-10px_rgba(242,169,0,0.55)]">
        <Icon size={22} className="text-signal-600" />
      </div>
      <p className="font-display text-base text-ink-800 mb-1">{title}</p>
      {description && (
        <p className="font-body text-sm text-ink-500 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Unable to load this data",
  description = "Please try again.",
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-4">
      <div className="h-12 w-12 rounded-card bg-alert-50 flex items-center justify-center mb-4">
        <AlertTriangle size={22} className="text-alert-600" />
      </div>
      <p className="font-display text-base text-ink-800 mb-1">{title}</p>
      <p className="font-body text-sm text-ink-500 max-w-sm">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-card bg-ink-900 text-white text-sm font-medium px-4 py-2 hover:bg-ink-800 transition-colors btn-lift"
        >
          <RefreshCw size={14} /> Try again
        </button>
      )}
    </div>
  );
}
