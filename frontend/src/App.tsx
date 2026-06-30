import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import MapPage from './pages/MapPage';
import ReportPage from './pages/ReportPage';
import ClusterDetailPage from './pages/ClusterDetailPage';
import StatsPage from './pages/StatsPage';
import DashboardPage from './pages/DashboardPage';
import AuthPage from './pages/AuthPage';
import LoadingScreen from './components/LoadingScreen';

function App() {
  const { initialize, loading, user, role } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" /> : <AuthPage />} />
      <Route element={<Layout />}>
        <Route index element={<MapPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/clusters/:id" element={<ClusterDetailPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route
          path="/dashboard"
          element={
            role === 'citizen' ? <Navigate to="/" /> : <DashboardPage />
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
