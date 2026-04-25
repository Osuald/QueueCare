import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Footer() {
  const { user, isStaff } = useAuth();
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">
            <span className="footer-logo-text">QueueCare</span>
            <span className="footer-logo-sub">Clinic</span>
          </div>
          <p className="footer-tagline">
            Streamlined appointment management for modern healthcare.
          </p>
        </div>

        <div className="footer-links">
          {user && (
            <div className="footer-col">
              <h4>Navigation</h4>
              <Link to="/dashboard">Dashboard</Link>
              <Link to="/appointments">Appointments</Link>
              {isStaff && <Link to="/queue">Today's Queue</Link>}
            </div>
          )}
          <div className="footer-col">
            <h4>Hours</h4>
            <span>Monday – Friday</span>
            <span>8:00 AM – 5:00 PM</span>
            <span className="footer-note">Closed on public holidays</span>
          </div>
          <div className="footer-col">
            <h4>Contact</h4>
            <span>osuald@queuecare.health</span>
            <span>+250 786 736 328</span>
            <span className="footer-note">Emergency: 114</span>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {year} QueueCare. All rights reserved.</span>
        <span className="footer-bottom-right">
          Built for quality healthcare management.
        </span>
      </div>
    </footer>
  );
}
