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

export default function Appointments() {
  const { isStaff } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelConfirm, setCancelConfirm] = useState(null); // appointment id
  const [cancelling, setCancelling] = useState(false);

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

  if (loading) return <Spinner />;

  const active = appointments.filter((a) => a.status !== 'cancelled');
  const cancelled = appointments.filter((a) => a.status === 'cancelled');

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

      {active.length === 0 && cancelled.length === 0 ? (
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
          {active.length > 0 && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="card-header">
                <h2 className="card-title">Active ({active.length})</h2>
              </div>
              <div className="appt-list">
                {active.map((a) => (
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
                      </div>
                      <div className="appt-reason">{a.reason}</div>
                    </div>
                    <div className="appt-actions">
                      <StatusBadge status={a.status} />
                      {a.status !== 'served' && (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cancelled.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Cancelled ({cancelled.length})</h2>
              </div>
              <div className="appt-list">
                {cancelled.map((a) => (
                  <div
                    className="appt-card"
                    key={a.id}
                    style={{ opacity: 0.6 }}
                    data-testid="appointment-card"
                    data-id={a.id}
                  >
                    <div className="appt-queue-num cancelled">—</div>
                    <div className="appt-details">
                      <div className="appt-doctor">{a.doctor}</div>
                      {isStaff && a.patient_name && (
                        <div className="appt-patient-name">{a.patient_name}</div>
                      )}
                      <div className="appt-meta">
                        <span>{formatDate(a.date)}</span>
                      </div>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                ))}
              </div>
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
