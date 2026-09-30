import {
  LayoutDashboard, Users, UserCog, BookOpen, ClipboardList, CreditCard,
  CheckSquare, FileText, TrendingUp, FolderKanban, ShieldAlert, Library,
  Bell, Settings, FileCheck, MessageSquare,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";

const navItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/applications", label: "Applications", icon: FileCheck },
  { to: "/admin/students", label: "Students", icon: Users },
  { to: "/admin/facilitators", label: "Facilitators", icon: UserCog },
  { to: "/admin/programs", label: "Programs", icon: BookOpen },
  { to: "/admin/enrollments", label: "Enrollments", icon: ClipboardList },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/attendance", label: "Attendance", icon: CheckSquare },
  { to: "/admin/assignments", label: "Assignments", icon: FileText },
  { to: "/admin/progress", label: "Progress", icon: TrendingUp },
  { to: "/admin/grades", label: "Grades", icon: FileText },
  { to: "/admin/projects", label: "Projects", icon: FolderKanban },
  { to: "/admin/conduct", label: "Conduct", icon: ShieldAlert },
  { to: "/admin/resources", label: "Resources", icon: Library },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }) {
  return (
    <DashboardLayout navItems={navItems} roleLabel="Admin">
      {children}
    </DashboardLayout>
  );
}
