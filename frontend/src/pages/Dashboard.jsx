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

export default function Dashboard() {
  const { user, isStaff } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

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
    (a) => a.date >= today && a.status !== 'cancelled'
  );
  const todayAppts = appointments.filter((a) => a.date === today && a.status !== 'cancelled');
  const served = queue.filter((a) => a.status === 'served').length;
  const waiting = queue.filter((a) => a.status !== 'served').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Welcome back, {user.name}</h1>
          <p>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        {!isStaff && (
          <Link to="/appointments/new" className="btn btn-primary" data-testid="new-appointment-btn">
            Book Appointment
          </Link>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card" data-testid="stat-upcoming">
          <div className="stat-label">Upcoming</div>
          <div className="stat-value">{upcoming.length}</div>
          <div className="stat-sub">appointments</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Today's Queue</div>
          <div className="stat-value">{queue.length}</div>
          <div className="stat-sub">total patients</div>
        </div>
        {isStaff && (
          <>
            <div className="stat-card">
              <div className="stat-label">Served Today</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>{served}</div>
              <div className="stat-sub">patients</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Waiting</div>
              <div className="stat-value" style={{ color: 'var(--warning)' }}>{waiting}</div>
              <div className="stat-sub">patients</div>
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
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
                      <span>Queue #{a.queue_number}</span>
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
