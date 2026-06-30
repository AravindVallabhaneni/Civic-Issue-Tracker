import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const { signIn, signUp, user } = useAuthStore();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') ?? '/';

  useEffect(() => {
    if (user) navigate(redirect, { replace: true });
  }, [user, navigate, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setInfo(null);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        navigate(redirect, { replace: true });
      } else {
        await signUp(email, password, fullName);
        setInfo('Account created! Check your email to confirm, then sign in.');
        setMode('signin');
      }
    } catch (err: any) {
      setError(err.message ?? 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Minimal navbar */}
      <nav style={{ height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <Link to="/" style={{ fontWeight: 700, fontSize: 18, color: 'var(--primary)', textDecoration: 'none' }}>CivicLink</Link>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16 }}>
          <Link to="/" style={{ color: 'var(--text-secondary)', fontSize: 14, textDecoration: 'none' }}>Map View</Link>
          <Link to="/issues" style={{ color: 'var(--text-secondary)', fontSize: 14, textDecoration: 'none' }}>All Issues</Link>
          <Link to="/stats" style={{ color: 'var(--text-secondary)', fontSize: 14, textDecoration: 'none' }}>Statistics</Link>
        </div>
      </nav>

      {/* Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
              {mode === 'signin' ? 'Sign in to CivicLink' : 'Create your account'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              {mode === 'signin'
                ? 'Report civic issues and track resolutions'
                : 'Join your community to report and track issues'}
            </p>
          </div>

          <div className="card" style={{ padding: 28 }}>
            {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
            {info && <div className="alert alert-success" style={{ marginBottom: 16 }}>{info}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {mode === 'signup' && (
                <div>
                  <label className="form-label">Full Name</label>
                  <input className="form-input" type="text" placeholder="John Doe"
                    value={fullName} onChange={e => setFullName(e.target.value)} required />
                </div>
              )}
              <div>
                <label className="form-label">Email address</label>
                <input className="form-input" type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
              </div>

              <button type="submit" className="btn btn-primary btn-lg w-full"
                style={{ justifyContent: 'center', marginTop: 4 }} disabled={loading}>
                {loading
                  ? <><span className="spinner" />{mode === 'signin' ? 'Signing in...' : 'Creating account...'}</>
                  : mode === 'signin' ? 'Sign In' : 'Create Account'
                }
              </button>
            </form>

            <div className="divider" style={{ margin: '20px 0' }} />

            <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setInfo(null); }}
                style={{ color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
                {mode === 'signin' ? 'Sign up free' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>

      <footer className="footer">
        <div>
          <div className="footer-brand">CivicLink</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>© 2024 Municipal Utility Department. All rights reserved.</div>
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
