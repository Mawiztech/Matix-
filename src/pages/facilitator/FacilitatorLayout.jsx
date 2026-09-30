import {
  LayoutDashboard, BookOpen, Users, CheckSquare, TrendingUp, FileText,
  FolderKanban, ShieldAlert, Library, CalendarDays, User, Settings, MessageSquare,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";

const navItems = [
  { to: "/facilitator/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/facilitator/programs", label: "My Programs", icon: BookOpen },
  { to: "/facilitator/students", label: "My Students", icon: Users },
  { to: "/facilitator/attendance", label: "Attendance", icon: CheckSquare },
  { to: "/facilitator/progress", label: "Progress", icon: TrendingUp },
  { to: "/facilitator/assignments", label: "Assignments", icon: FileText },
  { to: "/facilitator/projects", label: "Projects", icon: FolderKanban },
  { to: "/facilitator/conduct", label: "Professional Conduct", icon: ShieldAlert },
  { to: "/facilitator/resources", label: "Resources", icon: Library },
  { to: "/facilitator/sessions", label: "Training Sessions", icon: CalendarDays },
  { to: "/facilitator/messages", label: "Messages", icon: MessageSquare },
  { to: "/facilitator/profile", label: "Profile", icon: User },
  { to: "/facilitator/settings", label: "Settings", icon: Settings },
];

export default function FacilitatorLayout({ children }) {
  return (
    <DashboardLayout navItems={navItems} roleLabel="Facilitator">
      {children}
    </DashboardLayout>
  );
}
