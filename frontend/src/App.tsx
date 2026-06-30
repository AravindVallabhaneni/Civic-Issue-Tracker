import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import MapPage from './pages/MapPage';
import ReportPage from './pages/ReportPage';
import IssuesPage from './pages/IssuesPage';
import ClusterDetailPage from './pages/ClusterDetailPage';
import StatsPage from './pages/StatsPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import AuthPage from './pages/AuthPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/auth?redirect=/report" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuthStore();
  if (!user) return <Navigate to="/auth" replace />;
  if (profile && profile.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function StaffRoute({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuthStore();
  if (!user) return <Navigate to="/auth" replace />;
  if (profile && profile.role === 'citizen') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  const { setUser, setProfile } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase.from('profiles').select('*').eq('id', session.user.id).single()
          .then(({ data }) => setProfile(data));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase.from('profiles').select('*').eq('id', session.user.id).single()
          .then(({ data }) => setProfile(data));
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setProfile]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<MapPage />} />
          <Route path="/issues" element={<IssuesPage />} />
          <Route path="/issues/:id" element={<ClusterDetailPage />} />
          <Route path="/clusters/:id" element={<ClusterDetailPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/report" element={
            <ProtectedRoute><ReportPage /></ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <StaffRoute><DashboardPage /></StaffRoute>
          } />
          <Route path="/admin" element={
            <AdminRoute><AdminPage /></AdminRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
