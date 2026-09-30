import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import {
  Search, LayoutDashboard, User, BookOpen, CalendarDays, CheckSquare,
  TrendingUp, FileText, Award, FolderKanban, Library, Bell, Settings,
  Users, ShieldAlert, CreditCard, ClipboardList, MessageSquare, UserCog, FileCheck,
} from "lucide-react";

// Simple module-level toggle so any component (e.g. a header search button)
// can open the palette without prop-drilling or a context provider.
let externalOpenSetter = null;
export function openCommandPalette() {
  externalOpenSetter?.(true);
}

const ICONS = {
  dashboard: LayoutDashboard, profile: User, program: BookOpen, schedule: CalendarDays,
  attendance: CheckSquare, progress: TrendingUp, assignments: FileText, grades: Award,
  projects: FolderKanban, resources: Library, notifications: Bell, settings: Settings,
  students: Users, conduct: ShieldAlert, payments: CreditCard, applications: FileCheck,
  enrollments: ClipboardList, messages: MessageSquare, facilitators: UserCog,
};

const ROLE_PAGES = {
  student: ["dashboard", "profile", "program", "schedule", "attendance", "progress", "assignments", "grades", "projects", "resources", "messages", "notifications", "settings"],
  facilitator: ["dashboard", "programs", "students", "attendance", "progress", "assignments", "projects", "conduct", "resources", "sessions", "messages", "profile", "settings"],
  admin: ["dashboard", "applications", "students", "facilitators", "programs", "enrollments", "payments", "attendance", "assignments", "progress", "grades", "projects", "conduct", "resources", "messages", "notifications", "settings"],
};

const LABELS = {
  dashboard: "Dashboard", profile: "Profile", program: "My Program", programs: "My Programs",
  schedule: "Training Schedule", sessions: "Training Sessions", attendance: "Attendance",
  progress: "Progress", assignments: "Assignments", grades: "Grades", projects: "Projects",
  resources: "Resources", notifications: "Notifications", settings: "Settings",
  students: "Students", conduct: "Professional Conduct", payments: "Payments",
  applications: "Applications", enrollments: "Enrollments", messages: "Messages",
  facilitators: "Facilitators",
};

export default function CommandPalette() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [peopleResults, setPeopleResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    externalOpenSetter = setOpen;
    return () => { externalOpenSetter = null; };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const pageResults = useMemo(() => {
    if (!profile?.role) return [];
    const pages = ROLE_PAGES[profile.role] || [];
    const q = query.toLowerCase().trim();
    return pages
      .map((slug) => ({ slug, label: LABELS[slug] || slug, icon: ICONS[slug] || FileText }))
      .filter((p) => !q || p.label.toLowerCase().includes(q));
  }, [profile?.role, query]);

  // Admins and facilitators can also jump straight to a person by name.
  useEffect(() => {
    const q = query.trim();
    if (!q || q.length < 2 || profile?.role === "student") {
      setPeopleResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .ilike("full_name", `%${q}%`)
        .limit(5);
      if (!cancelled) setPeopleResults(data || []);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, profile?.role]);

  const allResults = useMemo(
    () => [
      ...pageResults.map((p) => ({ type: "page", ...p })),
      ...peopleResults.map((p) => ({ type: "person", ...p })),
    ],
    [pageResults, peopleResults]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [allResults.length]);

  const go = (result) => {
    setOpen(false);
    if (result.type === "page") {
      navigate(`/${profile.role}/${result.slug}`);
    } else if (result.type === "person") {
      if (profile.role === "admin" && result.role === "student") {
        navigate(`/admin/students/${result.id}`);
      } else if (profile.role === "facilitator" && result.role === "student") {
        navigate(`/facilitator/students/${result.id}`);
      } else {
        navigate(`/${profile.role}/messages`);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allResults[selectedIndex]) go(allResults[selectedIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-24 px-4 bg-ink-950/50 backdrop-blur-sm fade-in" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-lg bg-white rounded-card shadow-pop overflow-hidden modal-in ring-1 ring-gold-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-ink-100">
          <Search size={17} className="text-ink-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, people..."
            className="flex-1 outline-none text-sm text-ink-900 placeholder:text-ink-300"
          />
          <kbd className="hidden sm:inline text-[10px] text-ink-400 bg-ink-50 px-1.5 py-0.5 rounded border border-ink-100">esc</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto py-2">
          {allResults.length === 0 ? (
            <p className="text-sm text-ink-400 text-center py-8">No results found.</p>
          ) : (
            <>
              {pageResults.length > 0 && (
                <p className="px-4 py-1 text-[11px] font-medium text-ink-400 uppercase tracking-wide">Go to</p>
              )}
              {allResults.map((result, i) => {
                const Icon = result.type === "page" ? result.icon : User;
                return (
                  <button
                    key={`${result.type}-${result.slug || result.id}`}
                    onClick={() => go(result)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      i === selectedIndex ? "bg-ink-50" : ""
                    }`}
                  >
                    <div className="h-7 w-7 rounded-card bg-ink-100 text-ink-600 flex items-center justify-center shrink-0">
                      <Icon size={14} />
                    </div>
                    <span className="text-sm text-ink-800">
                      {result.type === "page" ? result.label : result.full_name}
                    </span>
                    {result.type === "person" && (
                      <span className="text-xs text-ink-400 capitalize ml-auto">{result.role}</span>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
