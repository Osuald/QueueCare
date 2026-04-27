import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import Spinner from '../components/Spinner';

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`} data-testid="appointment-status">
      {status}
    </span>
  );
}

function HistoryIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="12 8 12 12 14 14" />
      <path d="M3.05 11a9 9 0 1 0 .5-4" />
      <polyline points="3 3 3 7 7 7" />
    </svg>
  );
}

export default function Appointments() {
  const { isStaff } = useAuth();
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [serving, setServing] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => { loadAppointments(); }, []);

  async function loadAppointments() {
    try {
      const res = await api.get('/appointments');
      setAppointments(res.data.appointments);
    } catch {
      setError('Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel(id) {
    setCancelling(true);
    try {
      await api.delete(`/appointments/${id}`);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a))
      );
      setCancelConfirm(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel appointment.');
    } finally {
      setCancelling(false);
    }
  }

  async function handleServe(id) {
    setServing(id);
    setError('');
    try {
      await api.patch(`/queue/${id}/serve`);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'served' } : a))
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark as served.');
    } finally {
      setServing(null);
    }
  }

  if (loading) return <Spinner />;

  // Active: pending or confirmed only
  const upcoming = appointments
    .filter((a) => ['pending', 'confirmed'].includes(a.status))
    .sort((a, b) => a.date.localeCompare(b.date));

  // History: served + cancelled, newest first
  const history = appointments
    .filter((a) => ['served', 'cancelled'].includes(a.status))
    .sort((a, b) => b.date.localeCompare(a.date));

  const hasAny = upcoming.length > 0 || history.length > 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Appointments</h1>
          <p>{isStaff ? 'All patient appointments' : 'Your appointments'}</p>
        </div>
        {!isStaff && (
          <Link
            to="/appointments/new"
            className="btn btn-primary"
            data-testid="new-appointment-btn"
          >
            + New Appointment
          </Link>
        )}
      </div>

      {error && (
        <div className="alert alert-error" role="alert" data-testid="error-message">
          {error}
        </div>
      )}

      {!hasAny ? (
        <div className="empty-state card">
          <h3>No appointments found</h3>
          {!isStaff && (
            <p>
              <Link to="/appointments/new" className="text-primary">
                Book your first appointment
              </Link>
            </p>
          )}
        </div>
      ) : (
        <>
          {/* ── Upcoming / Active ── */}
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header">
              <h2 className="card-title">
                {isStaff ? 'Active Appointments' : 'Upcoming Appointments'}
                {upcoming.length > 0 && (
                  <span className="section-count">{upcoming.length}</span>
                )}
              </h2>
              {!isStaff && upcoming.length === 0 && (
                <Link to="/appointments/new" className="btn btn-primary btn-sm">
                  + Book
                </Link>
              )}
            </div>

            {upcoming.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                <h3>No active appointments</h3>
                <p>
                  {isStaff
                    ? 'All appointments have been served or cancelled.'
                    : 'You have no upcoming appointments.'}
                </p>
              </div>
            ) : (
              <div className="appt-list">
                {upcoming.map((a) => (
                  <div
                    className="appt-card"
                    key={a.id}
                    data-testid="appointment-card"
                    data-id={a.id}
                  >
                    <div className={`appt-queue-num ${a.status}`}>
                      <span data-testid="queue-number">{a.queue_number}</span>
                    </div>
                    <div className="appt-details">
                      <div className="appt-doctor">{a.doctor}</div>
                      {isStaff && a.patient_name && (
                        <div className="appt-patient-name">{a.patient_name}</div>
                      )}
                      <div className="appt-meta">
                        <span>{formatDate(a.date)}</span>
                        {a.date === today && (
                          <span className="today-badge">Today</span>
                        )}
                      </div>
                      <div className="appt-reason">{a.reason}</div>
                    </div>
                    <div className="appt-actions">
                      <StatusBadge status={a.status} />
                      {isStaff && a.date === today && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleServe(a.id)}
                          disabled={serving === a.id}
                          data-testid="mark-served-btn"
                          aria-label={`Mark ${a.patient_name || 'patient'} as served`}
                        >
                          {serving === a.id ? 'Marking...' : 'Mark Served'}
                        </button>
                      )}
                      {!isStaff && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => navigate(`/appointments/${a.id}/edit`)}
                          data-testid="edit-appointment-btn"
                          aria-label={`Edit appointment with ${a.doctor}`}
                        >
                          Edit
                        </button>
                      )}
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => setCancelConfirm(a.id)}
                        data-testid="cancel-appointment-btn"
                        aria-label={`Cancel appointment with ${a.doctor}`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── History / Logs ── */}
          {history.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HistoryIcon />
                    {isStaff ? 'Appointment Logs' : 'History'}
                    <span className="section-count">{history.length}</span>
                  </span>
                </h2>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowHistory((v) => !v)}
                  aria-expanded={showHistory}
                >
                  {showHistory ? 'Hide' : 'Show'}
                </button>
              </div>

              {showHistory && (
                isStaff ? (
                  /* Staff view — table-style log */
                  <div className="history-table-wrap">
                    <table className="history-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Patient</th>
                          <th>Doctor</th>
                          <th>Date</th>
                          <th>Reason</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((a) => (
                          <tr
                            key={a.id}
                            data-testid="appointment-card"
                            data-id={a.id}
                            className={a.status === 'cancelled' ? 'row-cancelled' : ''}
                          >
                            <td className="col-num">{a.queue_number ?? '—'}</td>
                            <td className="col-name">{a.patient_name || '—'}</td>
                            <td>{a.doctor}</td>
                            <td className="col-date">{formatDate(a.date)}</td>
                            <td className="col-reason">{a.reason}</td>
                            <td><StatusBadge status={a.status} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Patient view — card list */
                  <div className="appt-list">
                    {history.map((a) => (
                      <div
                        className="appt-card history-card"
                        key={a.id}
                        data-testid="appointment-card"
                        data-id={a.id}
                      >
                        <div className={`appt-queue-num ${a.status}`}>
                          {a.status === 'served' ? '✓' : '—'}
                        </div>
                        <div className="appt-details">
                          <div className="appt-doctor">{a.doctor}</div>
                          <div className="appt-meta">
                            <span>{formatDate(a.date)}</span>
                            {a.reason && <span>{a.reason}</span>}
                          </div>
                        </div>
                        <StatusBadge status={a.status} />
                      </div>
                    ))}
                  </div>
                )
              )}

              {!showHistory && (
                <p className="history-hint">
                  {history.filter((a) => a.status === 'served').length} served ·{' '}
                  {history.filter((a) => a.status === 'cancelled').length} cancelled
                  {' '}— click <strong>Show</strong> to view records
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Cancel confirmation modal */}
      {cancelConfirm && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Cancel Appointment</h2>
              <button
                className="modal-close"
                onClick={() => setCancelConfirm(null)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>
            <p>Are you sure you want to cancel this appointment? This cannot be undone.</p>
            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() => setCancelConfirm(null)}
                data-testid="cancel-modal-dismiss"
              >
                Keep it
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleCancel(cancelConfirm)}
                disabled={cancelling}
                data-testid="confirm-cancel-btn"
              >
                {cancelling ? 'Cancelling...' : 'Yes, cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
