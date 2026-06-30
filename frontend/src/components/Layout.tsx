import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  MapIcon, PlusCircleIcon, ChartBarIcon, 
  ClipboardDocumentListIcon, UserCircleIcon,
  BellIcon, ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

export default function Layout() {
  const { user, role, signOut } = useAuthStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="flex flex-col h-screen bg-civic-bg">
      {/* Top navbar */}
      <header className="flex-shrink-0 h-14 glass-dark border-b border-white/5 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">CP</span>
          </div>
          <span className="font-bold text-white text-lg tracking-tight">CivicPulse</span>
          <span className="hidden sm:block px-2 py-0.5 rounded-full bg-brand-600/20 text-brand-400 text-xs font-medium">
            BETA
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-600/20 text-brand-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <MapIcon className="w-4 h-4" />
            Map
          </NavLink>
          <NavLink
            to="/report"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-600/20 text-brand-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <PlusCircleIcon className="w-4 h-4" />
            Report Issue
          </NavLink>
          <NavLink
            to="/stats"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-600/20 text-brand-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <ChartBarIcon className="w-4 h-4" />
            Stats
          </NavLink>
          {(role === 'department_staff' || role === 'admin') && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-600/20 text-brand-400'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <ClipboardDocumentListIcon className="w-4 h-4" />
              Dashboard
            </NavLink>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
                <UserCircleIcon className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">{user.email?.split('@')[0]}</span>
                <span className="px-1.5 py-0.5 rounded bg-brand-600/30 text-brand-400 text-xs uppercase font-semibold">
                  {role}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                title="Sign out"
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
              </button>
            </>
          ) : (
            <NavLink to="/auth" className="btn-primary text-sm py-1.5">
              Sign in
            </NavLink>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden relative">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden flex-shrink-0 h-16 glass-dark border-t border-white/5 flex items-center justify-around px-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 p-2 rounded-lg transition-all ${
              isActive ? 'text-brand-400' : 'text-slate-500'
            }`
          }
        >
          <MapIcon className="w-5 h-5" />
          <span className="text-xs">Map</span>
        </NavLink>
        <NavLink
          to="/report"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 p-2 rounded-lg transition-all ${
              isActive ? 'text-brand-400' : 'text-slate-500'
            }`
          }
        >
          <PlusCircleIcon className="w-5 h-5" />
          <span className="text-xs">Report</span>
        </NavLink>
        <NavLink
          to="/stats"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 p-2 rounded-lg transition-all ${
              isActive ? 'text-brand-400' : 'text-slate-500'
            }`
          }
        >
          <ChartBarIcon className="w-5 h-5" />
          <span className="text-xs">Stats</span>
        </NavLink>
        {(role === 'department_staff' || role === 'admin') && (
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 p-2 rounded-lg transition-all ${
                isActive ? 'text-brand-400' : 'text-slate-500'
              }`
            }
          >
            <ClipboardDocumentListIcon className="w-5 h-5" />
            <span className="text-xs">Dashboard</span>
          </NavLink>
        )}
      </nav>
    </div>
  );
}
