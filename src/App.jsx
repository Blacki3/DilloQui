import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import Verify from './pages/Verify';
import Landing from './pages/Landing';
import About from './pages/About';
import AdminLayout from './layouts/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import Dashboard from './pages/admin/Dashboard';
import ReportsList from './pages/admin/ReportsList';
import Settings from './pages/admin/Settings';
import AdminProfile from './pages/admin/AdminProfile';
import StudentLayout from './layouts/StudentLayout';
import Forum from './pages/student/Forum';
import PostDetail from './pages/student/PostDetail';
import NewReport from './pages/student/NewReport';
import MyReports from './pages/student/MyReports';
import StudentProfile from './pages/student/StudentProfile';
import { useAuth } from './context/AuthContext';
import DemoSwitcher from './components/demo/DemoSwitcher';


// Protezione rotta Admin
function AdminProtectedRoute({ children }) {
  const { isAdminAuthenticated } = useAuth();
  return isAdminAuthenticated ? children : <Navigate to="/admin/login" replace />;
}

// Gestione rotte Studenti (Box) - Solo per la rotta iniziale /box/:slug
function BoxVerifyFlow() {
  const { slug } = useParams();
  const { isStudentAuthenticated } = useAuth();

  if (!slug) return <Navigate to="/admin/login" replace />;

  if (isStudentAuthenticated) {
    return <Navigate to={`/box/${slug}/forum`} replace />;
  }

  return <Verify slug={slug} />;
}

// Protezione rotte interne studenti
function StudentProtectedRoute({ children }) {
  const { slug } = useParams();
  const { isStudentAuthenticated } = useAuth();
  
  if (!slug) return <Navigate to="/admin/login" replace />;
  return isStudentAuthenticated ? children : <Navigate to={`/box/${slug}`} replace />;
}


function App() {
  return (
    <>
      <Routes>
        {/* Home → Landing page */}
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />

        {/* Route Studenti */}
        {/* Schermata di verifica OTP all'ingresso */}
        <Route path="/box/:slug" element={<BoxVerifyFlow />} />
        
        {/* Layout Studente proteso */}
        <Route path="/box/:slug" element={
          <StudentProtectedRoute>
            <StudentLayout />
          </StudentProtectedRoute>
        }>
          <Route path="forum" element={<Forum />} />
          <Route path="post/:postId" element={<PostDetail />} />
          <Route path="new" element={<NewReport />} />
          <Route path="history" element={<MyReports />} />
          <Route path="profile" element={<StudentProfile />} />
        </Route>

        {/* Route Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="reports" element={<ReportsList />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<AdminProfile />} />
        </Route>

        {/* Route Admin (DEMO) */}
        <Route path="/demo/admin" element={
          <AdminProtectedRoute>
            <AdminLayout />
          </AdminProtectedRoute>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="reports" element={<ReportsList />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<AdminProfile />} />
        </Route>

        {/* Fallback per rotte inesistenti */}
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
      <DemoSwitcher />
    </>
  );
}

export default App;
