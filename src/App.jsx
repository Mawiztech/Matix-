import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import ProtectedRoute from "./components/ProtectedRoute";
import FullScreenLoader from "./components/FullScreenLoader";

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/auth/Login"));
const Signup = lazy(() => import("./pages/auth/Signup"));

// Student
const StudentDashboard = lazy(() => import("./pages/student/Dashboard"));
const StudentProfile = lazy(() => import("./pages/student/Profile"));
const StudentProgram = lazy(() => import("./pages/student/MyProgram"));
const StudentSchedule = lazy(() => import("./pages/student/TrainingSchedule"));
const StudentAttendance = lazy(() => import("./pages/student/Attendance"));
const StudentProgress = lazy(() => import("./pages/student/Progress"));
const StudentAssignments = lazy(() => import("./pages/student/Assignments"));
const StudentAssignmentDetail = lazy(() => import("./pages/student/AssignmentDetail"));
const StudentGrades = lazy(() => import("./pages/student/Grades"));
const StudentProjects = lazy(() => import("./pages/student/Projects"));
const StudentResources = lazy(() => import("./pages/student/Resources"));
const StudentNotifications = lazy(() => import("./pages/student/Notifications"));
const StudentSettings = lazy(() => import("./pages/student/Settings"));
const StudentMessages = lazy(() => import("./pages/student/Messages"));

// Facilitator
const FacDashboard = lazy(() => import("./pages/facilitator/Dashboard"));
const FacPrograms = lazy(() => import("./pages/facilitator/MyPrograms"));
const FacStudents = lazy(() => import("./pages/facilitator/MyStudents"));
const FacStudentDetail = lazy(() => import("./pages/facilitator/StudentDetail"));
const FacAttendance = lazy(() => import("./pages/facilitator/Attendance"));
const FacProgress = lazy(() => import("./pages/facilitator/Progress"));
const FacAssignments = lazy(() => import("./pages/facilitator/Assignments"));
const FacAssignmentDetail = lazy(() => import("./pages/facilitator/AssignmentDetail"));
const FacProjects = lazy(() => import("./pages/facilitator/Projects"));
const FacConduct = lazy(() => import("./pages/facilitator/Conduct"));
const FacResources = lazy(() => import("./pages/facilitator/Resources"));
const FacSessions = lazy(() => import("./pages/facilitator/TrainingSessions"));
const FacProfile = lazy(() => import("./pages/facilitator/Profile"));
const FacNotifications = lazy(() => import("./pages/facilitator/Notifications"));
const FacSettings = lazy(() => import("./pages/facilitator/Settings"));
const FacMessages = lazy(() => import("./pages/facilitator/Messages"));

// Admin
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminApplications = lazy(() => import("./pages/admin/Applications"));
const AdminStudents = lazy(() => import("./pages/admin/Students"));
const AdminStudentDetail = lazy(() => import("./pages/admin/StudentDetail"));
const AdminFacilitators = lazy(() => import("./pages/admin/Facilitators"));
const AdminFacilitatorDetail = lazy(() => import("./pages/admin/FacilitatorDetail"));
const AdminPrograms = lazy(() => import("./pages/admin/Programs"));
const AdminEnrollments = lazy(() => import("./pages/admin/Enrollments"));
const AdminPayments = lazy(() => import("./pages/admin/Payments"));
const AdminAttendance = lazy(() => import("./pages/admin/Attendance"));
const AdminAssignments = lazy(() => import("./pages/admin/Assignments"));
const AdminProgress = lazy(() => import("./pages/admin/Progress"));
const AdminGrades = lazy(() => import("./pages/admin/Grades"));
const AdminProjects = lazy(() => import("./pages/admin/Projects"));
const AdminConduct = lazy(() => import("./pages/admin/Conduct"));
const AdminResources = lazy(() => import("./pages/admin/Resources"));
const AdminNotifications = lazy(() => import("./pages/admin/Notifications"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminMessages = lazy(() => import("./pages/admin/Messages"));

function RootRoute() {
  const { session, profile, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (session && profile) return <Navigate to={`/${profile.role}/dashboard`} replace />;
  // Signed out (or session present but profile still resolving as "no
  // profile yet") visitors see the public homepage rather than being
  // forced straight to the login form.
  return <Home />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConfirmProvider>
          <Toaster position="top-right" toastOptions={{
            style: { fontSize: "14px", fontFamily: "Manrope, sans-serif", background: "#0A1628", color: "#fff", borderRadius: "12px", padding: "12px 16px", boxShadow: "0 0 0 1px rgba(242,169,0,0.3), 0 16px 40px -12px rgba(6,14,31,0.6), 0 0 32px -8px rgba(242,169,0,0.35)" },
            success: { iconTheme: { primary: "#F2A900", secondary: "#0A1628" } },
          }} />
          <Suspense fallback={<FullScreenLoader />}>
            <Routes>
              <Route path="/" element={<RootRoute />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Student */}
              <Route path="/student/dashboard" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
              <Route path="/student/profile" element={<ProtectedRoute role="student"><StudentProfile /></ProtectedRoute>} />
              <Route path="/student/program" element={<ProtectedRoute role="student"><StudentProgram /></ProtectedRoute>} />
              <Route path="/student/schedule" element={<ProtectedRoute role="student"><StudentSchedule /></ProtectedRoute>} />
              <Route path="/student/attendance" element={<ProtectedRoute role="student"><StudentAttendance /></ProtectedRoute>} />
              <Route path="/student/progress" element={<ProtectedRoute role="student"><StudentProgress /></ProtectedRoute>} />
              <Route path="/student/assignments" element={<ProtectedRoute role="student"><StudentAssignments /></ProtectedRoute>} />
              <Route path="/student/assignments/:id" element={<ProtectedRoute role="student"><StudentAssignmentDetail /></ProtectedRoute>} />
              <Route path="/student/grades" element={<ProtectedRoute role="student"><StudentGrades /></ProtectedRoute>} />
              <Route path="/student/projects" element={<ProtectedRoute role="student"><StudentProjects /></ProtectedRoute>} />
              <Route path="/student/resources" element={<ProtectedRoute role="student"><StudentResources /></ProtectedRoute>} />
              <Route path="/student/notifications" element={<ProtectedRoute role="student"><StudentNotifications /></ProtectedRoute>} />
              <Route path="/student/messages" element={<ProtectedRoute role="student"><StudentMessages /></ProtectedRoute>} />
              <Route path="/student/settings" element={<ProtectedRoute role="student"><StudentSettings /></ProtectedRoute>} />

              {/* Facilitator */}
              <Route path="/facilitator/dashboard" element={<ProtectedRoute role="facilitator"><FacDashboard /></ProtectedRoute>} />
              <Route path="/facilitator/programs" element={<ProtectedRoute role="facilitator"><FacPrograms /></ProtectedRoute>} />
              <Route path="/facilitator/students" element={<ProtectedRoute role="facilitator"><FacStudents /></ProtectedRoute>} />
              <Route path="/facilitator/students/:id" element={<ProtectedRoute role="facilitator"><FacStudentDetail /></ProtectedRoute>} />
              <Route path="/facilitator/attendance" element={<ProtectedRoute role="facilitator"><FacAttendance /></ProtectedRoute>} />
              <Route path="/facilitator/progress" element={<ProtectedRoute role="facilitator"><FacProgress /></ProtectedRoute>} />
              <Route path="/facilitator/assignments" element={<ProtectedRoute role="facilitator"><FacAssignments /></ProtectedRoute>} />
              <Route path="/facilitator/assignments/:id" element={<ProtectedRoute role="facilitator"><FacAssignmentDetail /></ProtectedRoute>} />
              <Route path="/facilitator/projects" element={<ProtectedRoute role="facilitator"><FacProjects /></ProtectedRoute>} />
              <Route path="/facilitator/conduct" element={<ProtectedRoute role="facilitator"><FacConduct /></ProtectedRoute>} />
              <Route path="/facilitator/resources" element={<ProtectedRoute role="facilitator"><FacResources /></ProtectedRoute>} />
              <Route path="/facilitator/sessions" element={<ProtectedRoute role="facilitator"><FacSessions /></ProtectedRoute>} />
              <Route path="/facilitator/profile" element={<ProtectedRoute role="facilitator"><FacProfile /></ProtectedRoute>} />
              <Route path="/facilitator/notifications" element={<ProtectedRoute role="facilitator"><FacNotifications /></ProtectedRoute>} />
              <Route path="/facilitator/messages" element={<ProtectedRoute role="facilitator"><FacMessages /></ProtectedRoute>} />
              <Route path="/facilitator/settings" element={<ProtectedRoute role="facilitator"><FacSettings /></ProtectedRoute>} />

              {/* Admin */}
              <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/applications" element={<ProtectedRoute role="admin"><AdminApplications /></ProtectedRoute>} />
              <Route path="/admin/students" element={<ProtectedRoute role="admin"><AdminStudents /></ProtectedRoute>} />
              <Route path="/admin/students/:id" element={<ProtectedRoute role="admin"><AdminStudentDetail /></ProtectedRoute>} />
              <Route path="/admin/facilitators" element={<ProtectedRoute role="admin"><AdminFacilitators /></ProtectedRoute>} />
              <Route path="/admin/facilitators/:id" element={<ProtectedRoute role="admin"><AdminFacilitatorDetail /></ProtectedRoute>} />
              <Route path="/admin/programs" element={<ProtectedRoute role="admin"><AdminPrograms /></ProtectedRoute>} />
              <Route path="/admin/enrollments" element={<ProtectedRoute role="admin"><AdminEnrollments /></ProtectedRoute>} />
              <Route path="/admin/payments" element={<ProtectedRoute role="admin"><AdminPayments /></ProtectedRoute>} />
              <Route path="/admin/attendance" element={<ProtectedRoute role="admin"><AdminAttendance /></ProtectedRoute>} />
              <Route path="/admin/assignments" element={<ProtectedRoute role="admin"><AdminAssignments /></ProtectedRoute>} />
              <Route path="/admin/progress" element={<ProtectedRoute role="admin"><AdminProgress /></ProtectedRoute>} />
              <Route path="/admin/grades" element={<ProtectedRoute role="admin"><AdminGrades /></ProtectedRoute>} />
              <Route path="/admin/projects" element={<ProtectedRoute role="admin"><AdminProjects /></ProtectedRoute>} />
              <Route path="/admin/conduct" element={<ProtectedRoute role="admin"><AdminConduct /></ProtectedRoute>} />
              <Route path="/admin/resources" element={<ProtectedRoute role="admin"><AdminResources /></ProtectedRoute>} />
              <Route path="/admin/notifications" element={<ProtectedRoute role="admin"><AdminNotifications /></ProtectedRoute>} />
              <Route path="/admin/messages" element={<ProtectedRoute role="admin"><AdminMessages /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute>} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ConfirmProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
