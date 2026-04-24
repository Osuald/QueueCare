import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout, isStaff } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-brand">
        QueueCare <span>Clinic</span>
      </div>

      <div className="navbar-links">
        {user && (
          <>
            <NavLink to="/dashboard" data-testid="nav-dashboard">
              Dashboard
            </NavLink>
            <NavLink to="/appointments" data-testid="nav-appointments">
              Appointments
            </NavLink>
            {isStaff && (
              <NavLink to="/queue" data-testid="nav-queue">
                Queue
              </NavLink>
            )}
            <span className="navbar-user">
              {user.name} ({user.role})
            </span>
            <button
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
