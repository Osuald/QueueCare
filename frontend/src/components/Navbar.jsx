import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout, isStaff } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login');
    setMenuOpen(false);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-brand">
        <span className="navbar-logo">QueueCare</span>
        <span className="navbar-logo-sub">Clinic</span>
      </div>

      {user && (
        <button
          className="navbar-hamburger"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <span className={`hamburger-icon ${menuOpen ? 'open' : ''}`}>
            <span /><span /><span />
          </span>
        </button>
      )}

      <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
        {user && (
          <>
            <NavLink to="/dashboard" data-testid="nav-dashboard" onClick={closeMenu}>
              Dashboard
            </NavLink>
            <NavLink to="/appointments" data-testid="nav-appointments" onClick={closeMenu}>
              Appointments
            </NavLink>
            {isStaff && (
              <NavLink to="/queue" data-testid="nav-queue" onClick={closeMenu}>
                Queue
              </NavLink>
            )}
            <div className="navbar-divider" />
            <div className="navbar-user">
              <span className="navbar-user-name">{user.name}</span>
              <span className="navbar-user-role">{user.role}</span>
            </div>
            <button
              className="btn-logout"
              onClick={handleLogout}
              data-testid="logout-btn"
              aria-label="Log out"
            >
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
