import { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import Landing from './pages/Landing';
import About from './pages/About';
import { useAuth } from './context/AuthContext';

// Lazy loading delle schermate di accesso (caricamento indipendente e rapido)
const Verify = lazy(() => import('./pages/Verify'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));

import DemoSwitcher from './components/demo/DemoSwitcher';

// Funzione helper per estrarre i componenti dal bundle unico
const lazyFromBundle = (componentName) => {
  return lazy(() => import('./bundles/AppBundle').then(m => ({ default: m[componentName] })));
};

// Caricamento dell'intera app in un unico Chunk (Sportello Studenti + Admin)
const AdminLayout = lazyFromBundle('AdminLayout');
const Dashboard = lazyFromBundle('Dashboard');
const ReportsList = lazyFromBundle('ReportsList');
const Settings = lazyFromBundle('Settings');
const AdminProfile = lazyFromBundle('AdminProfile');
const UsersList = lazyFromBundle('UsersList');
const StudentLayout = lazyFromBundle('StudentLayout');
const Forum = lazyFromBundle('Forum');
const PostDetail = lazyFromBundle('PostDetail');
const NewReport = lazyFromBundle('NewReport');
const MyReports = lazyFromBundle('MyReports');
const StudentProfile = lazyFromBundle('StudentProfile');
const Drafts = lazyFromBundle('Drafts');
const Tendenze = lazyFromBundle('Tendenze');

// Fallback Loader in stile Brutalista
const BrutalistLoader = () => (
  <div style={{
    height: '100vh', width: '100vw',
    background: 'var(--b-black)', color: 'var(--b-yellow)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 900,
    textTransform: 'uppercase', letterSpacing: '0.1em'
  }}>
    Caricamento...
  </div>
);


// Riporta in cima alla pagina ad ogni cambio rotta (escluse ancore e scrollTo gestiti dalla Landing)
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const state = useLocation().state;
  useEffect(() => {
    if (hash || state?.scrollTo) return;
    
    // Nelle rotte pubbliche (Landing e Chi Siamo), lo scroll in cima
    // viene gestito in modo fluido da onExitComplete in PublicLayout.
    if (pathname === '/' || pathname === '/chi-siamo') return;
    
    window.scrollTo(0, 0);
  }, [pathname, hash, state]);
  return null;
}

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
      <ScrollToTop />
      <Suspense fallback={<BrutalistLoader />}>
        <Routes>
          {/* Pagine pubbliche con transizione di cambio pagina */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/chi-siamo" element={<About />} />
          </Route>

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
            <Route path="tendenze" element={<Tendenze />} />
            <Route path="post/:postId" element={<PostDetail />} />
            <Route path="new" element={<NewReport />} />
            <Route path="history" element={<MyReports />} />
            <Route path="drafts" element={<Drafts />} />
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
            <Route path="users" element={<UsersList />} />
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
            <Route path="users" element={<UsersList />} />
            <Route path="profile" element={<AdminProfile />} />
          </Route>

          {/* Fallback per rotte inesistenti */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <DemoSwitcher />
      </Suspense>
    </>
  );
}

export default App;
