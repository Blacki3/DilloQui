import { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import Landing from './pages/Landing';
import { useAuth } from './context/AuthContext';

// Lazy loading delle schermate di accesso (caricamento indipendente e rapido)
const Verify = lazy(() => import('./pages/Verify'));
const About = lazy(() => import('./pages/About'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Cookie = lazy(() => import('./pages/Cookie'));
import AdminLogin from './pages/admin/AdminLogin';
import PasswordRecoveryModal from './components/PasswordRecoveryModal';
import DemoSwitcher from './components/demo/DemoSwitcher';

// Helper per il preloading in background
const lazyWithPreload = (factory) => {
  const Component = lazy(factory);
  Component.preload = factory;
  return Component;
};

// Code Splitting con Preload - Esportati per poter chiamare .preload() nei Layout
export const AdminLayout = lazyWithPreload(() => import('./layouts/AdminLayout'));
export const Dashboard = lazyWithPreload(() => import('./pages/admin/Dashboard'));
export const ReportsList = lazyWithPreload(() => import('./pages/admin/ReportsList'));
export const Settings = lazyWithPreload(() => import('./pages/admin/Settings'));
export const AdminProfile = lazyWithPreload(() => import('./pages/admin/AdminProfile'));
export const UsersList = lazyWithPreload(() => import('./pages/admin/UsersList'));
// Volutamente senza preload: il gate si scarica solo entrando nell'URL,
// e il pannello vero è importato da lì soltanto a sblocco avvenuto
const PlatformGate = lazy(() => import('./pages/admin/PlatformGate'));

export const StudentLayout = lazyWithPreload(() => import('./layouts/StudentLayout'));
export const Forum = lazyWithPreload(() => import('./pages/student/Forum'));
export const PostDetail = lazyWithPreload(() => import('./pages/student/PostDetail'));
export const NewReport = lazyWithPreload(() => import('./pages/student/NewReport'));
export const MyReports = lazyWithPreload(() => import('./pages/student/MyReports'));
export const StudentProfile = lazyWithPreload(() => import('./pages/student/StudentProfile'));
export const Drafts = lazyWithPreload(() => import('./pages/student/Drafts'));
export const Tendenze = lazyWithPreload(() => import('./pages/student/Tendenze'));
export const Regolamento = lazyWithPreload(() => import('./pages/student/Regolamento'));

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
// allowMock=true solo per /demo/admin/* — il token mock NON sblocca /admin/*
function AdminProtectedRoute({ children, allowMock = false }) {
  const { isRealAdminAuthenticated, isAdminAuthenticated, loading } = useAuth();
  if (loading) return <BrutalistLoader />;
  const ok = allowMock ? isAdminAuthenticated : isRealAdminAuthenticated;
  return ok ? children : <Navigate to="/admin/login" replace />;
}

// Gestione rotte Studenti (Box) - Solo per la rotta iniziale /box/:slug
function BoxVerifyFlow() {
  const { slug } = useParams();
  const { isStudentAuthenticated, loading, profile } = useAuth();

  if (!slug) return <Navigate to="/admin/login" replace />;
  if (loading) return <BrutalistLoader />;

  // Studente già loggato, appartenente a questa box e con profilo COMPLETO
  // (nome compilato): redirect al forum. Senza il controllo sul nome, il
  // redirect scattava subito dopo la verifica OTP saltando il passo 3.
  const profileComplete = !!profile?.nome;
  if (isStudentAuthenticated && (slug === 'demo' || (profile?.box_slug === slug && profileComplete))) {
    return <Navigate to={`/box/${slug}/forum`} replace />;
  }

  return <Verify slug={slug} />;
}

// Protezione rotte interne studenti
function StudentProtectedRoute({ children }) {
  const { slug } = useParams();
  const { isStudentAuthenticated, loading, profile } = useAuth();

  if (!slug) return <Navigate to="/admin/login" replace />;
  if (loading) return <BrutalistLoader />;

  // Demo: basta il token mock. Reale: stessa box + profilo completo (nome),
  // come BoxVerifyFlow — altrimenti si salta il passo 3 di Verify.
  const isAuthorized = slug === 'demo'
    ? isStudentAuthenticated
    : (isStudentAuthenticated && profile?.box_slug === slug && !!profile?.nome);

  return isAuthorized ? children : <Navigate to={`/box/${slug}`} replace />;
}


function App() {
  const { isPlatformAdmin, loading: authLoading } = useAuth();
  // Finché la sessione non è risolta lo stato è ignoto: senza questa
  // attesa un deep link a /admin/piattaforma rimbalzerebbe alla home
  // prima che il server abbia risposto.
  const platformUnknown = authLoading || isPlatformAdmin === null;

  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<BrutalistLoader />}>
        <Routes>
          {/* Pagine pubbliche con transizione di cambio pagina */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/chi-siamo" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/termini" element={<Terms />} />
            <Route path="/cookie" element={<Cookie />} />
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
            <Route path="regolamento" element={<Regolamento />} />
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
            {/* Gestione piattaforma: la rotta esiste solo per chi il server
                ha riconosciuto come gestore. Per tutti gli altri l'URL cade
                nel fallback e nessun chunk viene mai richiesto. */}
            {platformUnknown && <Route path="piattaforma" element={<BrutalistLoader />} />}
            {isPlatformAdmin === true && <Route path="piattaforma" element={<PlatformGate />} />}
          </Route>

          {/* Route Admin (DEMO) — allowMock: solo qui il token mock è valido */}
          <Route path="/demo/admin" element={
            <AdminProtectedRoute allowMock>
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
        <PasswordRecoveryModal />
      </Suspense>
    </>
  );
}

export default App;
