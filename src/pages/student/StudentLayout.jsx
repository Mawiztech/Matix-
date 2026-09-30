import {
  LayoutDashboard, User, BookOpen, CalendarDays, CheckSquare,
  TrendingUp, FileText, Award, FolderKanban, Library, Bell, Settings, MessageSquare,
} from "lucide-react";
import DashboardLayout from "../../components/DashboardLayout";

const navItems = [
  { to: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/student/profile", label: "Profile", icon: User },
  { to: "/student/program", label: "My Program", icon: BookOpen },
  { to: "/student/schedule", label: "Training Schedule", icon: CalendarDays },
  { to: "/student/attendance", label: "Attendance", icon: CheckSquare },
  { to: "/student/progress", label: "Progress", icon: TrendingUp },
  { to: "/student/assignments", label: "Assignments", icon: FileText },
  { to: "/student/grades", label: "Grades", icon: Award },
  { to: "/student/projects", label: "Projects", icon: FolderKanban },
  { to: "/student/resources", label: "Resources", icon: Library },
  { to: "/student/messages", label: "Messages", icon: MessageSquare },
  { to: "/student/notifications", label: "Notifications", icon: Bell },
  { to: "/student/settings", label: "Settings", icon: Settings },
];

export default function StudentLayout({ children }) {
  return (
    <DashboardLayout navItems={navItems} roleLabel="Student">
      {children}
    </DashboardLayout>
  );
}
