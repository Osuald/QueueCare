import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import Spinner from '../components/Spinner';

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

function IconCalendar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconCheckCircle() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default function Dashboard() {
  const { user, isStaff } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  useEffect(() => {
    async function load() {
      try {
        const [apptRes, queueRes] = await Promise.all([
          api.get('/appointments'),
          api.get('/queue/today'),
        ]);
        setAppointments(apptRes.data.appointments);
        setQueue(queueRes.data.queue);
      } catch {
        // handled by interceptor
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <Spinner />;

  const upcoming = appointments.filter(
    (a) => a.date >= today && ['pending', 'confirmed'].includes(a.status)
  );
  const todayAppts = appointments.filter(
    (a) => a.date === today && ['pending', 'confirmed', 'served'].includes(a.status)
  );
  const served = queue.filter((a) => a.status === 'served').length;
  const waiting = queue.filter((a) => a.status !== 'served').length;
  const queueTotal = queue.length;
  const servedPercent = queueTotal > 0 ? Math.round((served / queueTotal) * 100) : 0;

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Welcome back, {user.name}</h1>
          <p className="dashboard-date">{todayLabel}</p>
        </div>
        {!isStaff && (
          <Link to="/appointments/new" className="btn btn-primary" data-testid="new-appointment-btn">
            + Book Appointment
          </Link>
        )}
        {isStaff && (
          <Link to="/queue" className="btn btn-primary" data-testid="manage-queue-btn">
            Manage Queue
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card" data-testid="stat-upcoming">
          <div className="stat-icon stat-icon-primary">
            <IconCalendar />
          </div>
          <div className="stat-body">
            <div className="stat-label">Upcoming</div>
            <div className="stat-value">{upcoming.length}</div>
            <div className="stat-sub">appointments</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-info">
            <IconUsers />
          </div>
          <div className="stat-body">
            <div className="stat-label">Today's Queue</div>
            <div className="stat-value">{queueTotal}</div>
            <div className="stat-sub">total patients</div>
          </div>
        </div>

        {isStaff && (
          <>
            <div className="stat-card">
              <div className="stat-icon stat-icon-success">
                <IconCheckCircle />
              </div>
              <div className="stat-body">
                <div className="stat-label">Served Today</div>
                <div className="stat-value" style={{ color: 'var(--success)' }}>{served}</div>
                <div className="stat-sub">patients</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon stat-icon-warning">
                <IconClock />
              </div>
              <div className="stat-body">
                <div className="stat-label">Waiting</div>
                <div className="stat-value" style={{ color: 'var(--warning)' }}>{waiting}</div>
                <div className="stat-sub">in queue</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Queue progress bar (staff only) */}
      {isStaff && queueTotal > 0 && (
        <div className="card queue-progress-card">
          <div className="queue-progress-header">
            <span className="queue-progress-label">Queue Progress</span>
            <span className="queue-progress-pct">{served} / {queueTotal} served ({servedPercent}%)</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${servedPercent}%` }}
              role="progressbar"
              aria-valuenow={servedPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <div className="queue-progress-footer">
            <Link to="/queue" className="btn btn-outline btn-sm">
              View full queue <IconArrowRight />
            </Link>
          </div>
        </div>
      )}

      {/* Patient quick actions */}
      {!isStaff && upcoming.length === 0 && (
        <div className="card quick-action-card">
          <div className="quick-action-body">
            <div className="quick-action-icon">
              <IconCalendar />
            </div>
            <div>
              <h3 className="quick-action-title">No upcoming appointments</h3>
              <p className="quick-action-text">Book an appointment to see a doctor at your preferred time.</p>
            </div>
          </div>
          <Link to="/appointments/new" className="btn btn-primary">
            Book Now <IconArrowRight />
          </Link>
        </div>
      )}

      {/* Two-column lower section */}
      <div className="dashboard-grid">
        {/* Today's appointments */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Today's Appointments</h2>
            <Link to="/appointments" className="btn btn-outline btn-sm">View all</Link>
          </div>
          {todayAppts.length === 0 ? (
            <div className="empty-state">
              <h3>No appointments today</h3>
              <p>{isStaff ? 'No patients scheduled for today.' : 'You have no appointments today.'}</p>
            </div>
          ) : (
            <div className="appt-list">
              {todayAppts.slice(0, 5).map((a) => (
                <div className="appt-card" key={a.id} data-testid="appointment-card">
                  <div className={`appt-queue-num ${a.status}`}>
                    {a.queue_number}
                  </div>
                  <div className="appt-details">
                    <div className="appt-doctor">{a.doctor}</div>
                    {isStaff && a.patient_name && (
                      <div className="appt-patient-name">{a.patient_name}</div>
                    )}
                    <div className="appt-reason">{a.reason}</div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Upcoming</h2>
            <Link to="/appointments" className="btn btn-outline btn-sm">All</Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="empty-state">
              <h3>Nothing scheduled</h3>
              {!isStaff && (
                <p>
                  <Link to="/appointments/new" className="text-primary">Book an appointment</Link>
                </p>
              )}
            </div>
          ) : (
            <div className="appt-list">
              {upcoming.slice(0, 5).map((a) => (
                <div className="appt-card" key={a.id}>
                  <div className="appt-details">
                    <div className="appt-doctor">{a.doctor}</div>
                    {isStaff && a.patient_name && (
                      <div className="appt-patient-name">{a.patient_name}</div>
                    )}
                    <div className="appt-meta">
                      <span>{formatDate(a.date)}</span>
                      {a.queue_number && <span>Queue #{a.queue_number}</span>}
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
