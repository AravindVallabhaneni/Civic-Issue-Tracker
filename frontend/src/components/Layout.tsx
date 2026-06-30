import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Layout() {
  const { user, profile, signOut } = useAuthStore();
  const navigate = useNavigate();
  const isAdmin = profile?.role === 'admin';
  const isStaff = profile?.role === 'department_staff' || profile?.role === 'admin';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '';

  return (
    <div className="page-content">
      <nav className="navbar">
        <Link to="/" className="navbar-brand">CivicLink</Link>

        <div className="navbar-nav">
          {isAdmin ? (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Dashboard</NavLink>
              <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} end>Map</NavLink>
              <NavLink to="/stats" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Statistics</NavLink>
              <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                style={{ color: '#7c3aed' }}>⚙ Admin</NavLink>
            </>
          ) : isStaff ? (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Dashboard</NavLink>
              <NavLink to="/issues" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>My Reports</NavLink>
              <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} end>Map</NavLink>
              <NavLink to="/stats" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Statistics</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} end>Map View</NavLink>
              <NavLink to="/issues" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>My Reports</NavLink>
              <NavLink to="/stats" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Statistics</NavLink>
            </>
          )}
        </div>

        <div className="navbar-actions">
          {user ? (
            <>
              {!isAdmin && (
                <Link to="/report" className="btn btn-primary btn-sm">⊕ Report an Issue</Link>
              )}
              {isAdmin && (
                <Link to="/admin" className="btn btn-primary btn-sm" style={{ background: '#7c3aed', borderColor: '#7c3aed' }}>⚙ Admin Panel</Link>
              )}
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: isAdmin ? '#7c3aed' : 'var(--primary)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600, cursor: 'pointer'
              }} onClick={handleSignOut} title="Sign out">
                {initials}
              </div>
            </>
          ) : (
            <>
              <Link to="/auth" className="btn btn-ghost btn-sm">Login</Link>
              <Link to="/report" className="btn btn-primary btn-sm">⊕ Report an Issue</Link>
            </>
          )}
        </div>
      </nav>

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>

      <footer className="footer">
        <div>
          <div className="footer-brand">CivicLink</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            © 2024 Municipal Utility Department. All rights reserved.
          </div>
        </div>
        <div className="footer-links">
          <a href="#">Transparency Notice</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Accessibility</a>
          <a href="#">Contact Support</a>
        </div>
      </footer>
    </div>
  );
}
