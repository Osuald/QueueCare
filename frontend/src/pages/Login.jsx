import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate('/dashboard', { replace: true });
    return null;
  }

  function validate() {
    const e = {};
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!form.email.includes('@')) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setServerError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-logo">
          <h1>QueueCare</h1>
          <p>Sign in to your account</p>
        </div>

        {serverError && (
          <div className="alert alert-error" data-testid="error-message" role="alert">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate data-testid="login-form">
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={errors.email ? 'error' : ''}
              data-testid="email-input"
              placeholder="you@example.com"
            />
            {errors.email && <span className="field-error" role="alert">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className={errors.password ? 'error' : ''}
              data-testid="password-input"
              placeholder="••••••••"
            />
            {errors.password && <span className="field-error" role="alert">{errors.password}</span>}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
            data-testid="submit-btn"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="auth-footer">
          Don&apos;t have an account?{' '}
          <Link to="/register" data-testid="register-link">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
