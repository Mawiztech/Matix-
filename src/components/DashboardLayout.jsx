import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { useConfirm } from "../context/ConfirmContext";
import NotificationBell from "./NotificationBell";
import CommandPalette, { openCommandPalette } from "./CommandPalette";

export default function DashboardLayout({ navItems, roleLabel, children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();

  const handleLogout = async () => {
    const ok = await confirm({
      title: "Sign out?",
      description: "You'll need to sign in again to access your portal.",
      confirmLabel: "Sign out",
      danger: false,
    });
    if (!ok) return;
    await signOut();
    toast.success("Signed out successfully");
    navigate("/login", { replace: true });
  };

  const initials = (profile?.full_name || profile?.email || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-ink-50 flex bg-[radial-gradient(ellipse_120%_60%_at_50%_-10%,rgba(11,37,69,0.05),transparent)]">
      {/* Mobile drawer backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-ink-950/50 z-30 lg:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-ink-950 text-white flex flex-col overflow-hidden [&>*:not(.aurora)]:relative transition-transform duration-200 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="aurora aurora-sm" aria-hidden="true"><span className="orb orb-gold" /><span className="orb orb-blue" /></div>
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-white/10 shrink-0">
          <img
            src="/brand/logo.png"
            alt="MawizTech"
            className="h-9 w-9 object-contain shrink-0 float-a drop-shadow-[0_0_14px_rgba(242,169,0,0.6)]"
          />
          <div className="leading-tight min-w-0">
            <p className="font-display font-semibold text-sm tracking-tight">MawizTech</p>
            <p className="text-xs text-gold-400">{roleLabel}</p>
          </div>
          <button
            className="ml-auto lg:hidden text-ink-400"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-2.5 rounded-card text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "nav-glow text-white border-l-[3px] border-gold-500 pl-[9px]"
                    : "text-ink-300 hover:bg-white/5 hover:text-white border-l-[3px] border-transparent pl-[9px]"
                }`
              }
            >
              <item.icon size={17} strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-card text-sm font-medium text-ink-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut size={17} strokeWidth={2} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 bg-white/80 backdrop-blur-xl border-b border-ink-200 flex items-center gap-3 px-4 lg:px-6 sticky top-0 z-20">
          <button
            className="lg:hidden text-ink-700"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <button
            onClick={openCommandPalette}
            className="hidden sm:flex flex-1 max-w-xs items-center gap-2 text-sm text-ink-400 bg-ink-50 hover:bg-ink-100 rounded-card px-3 py-2 transition-colors border border-transparent hover:border-ink-200"
          >
            <Search size={15} />
            <span>Search...</span>
            <kbd className="ml-auto text-[10px] font-mono text-ink-500 bg-white px-1.5 py-0.5 rounded-block border border-ink-300">⌘K</kbd>
          </button>
          <button
            onClick={openCommandPalette}
            className="sm:hidden text-ink-600"
            aria-label="Search"
          >
            <Search size={19} />
          </button>
          <div className="flex-1" />
          <NotificationBell />
          <div className="flex items-center gap-2 pl-3 ml-1 border-l border-ink-200">
            <div className="h-8 w-8 rounded-block bg-gradient-to-br from-signal-500 to-signal-700 text-gold-400 ring-2 ring-gold-500/30 shadow-[0_0_16px_-2px_rgba(242,169,0,0.5)] flex items-center justify-center text-xs font-semibold shrink-0">
              {initials}
            </div>
            <div className="hidden sm:block leading-tight">
              <p className="text-sm font-medium text-ink-900 truncate max-w-[140px]">
                {profile?.full_name || "—"}
              </p>
              <p className="text-[11px] text-ink-400 truncate max-w-[140px]">{profile?.email}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 max-w-[1400px] w-full mx-auto page-enter relative">{children}</main>
      </div>
      <CommandPalette />
    </div>
  );
}
