import { useState, useEffect } from 'react';
import api from '../api/client';
import Spinner from '../components/Spinner';

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
}

function IconRefresh() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

export default function Queue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [serving, setServing] = useState(null);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  useEffect(() => { loadQueue(); }, []);

  async function loadQueue() {
    setLoading(true);
    try {
      const res = await api.get('/queue/today');
      setQueue(res.data.queue);
    } catch {
      setError('Failed to load queue.');
    } finally {
      setLoading(false);
    }
  }

  async function handleServe(id) {
    setServing(id);
    setError('');
    try {
      await api.patch(`/queue/${id}/serve`);
      setQueue((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'served' } : a))
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status.');
    } finally {
      setServing(null);
    }
  }

  if (loading) return <Spinner />;

  const waiting = queue.filter((a) => a.status !== 'served');
  const served = queue.filter((a) => a.status === 'served');
  const servedPercent = queue.length > 0
    ? Math.round((served.length / queue.length) * 100)
    : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Today's Queue</h1>
          <p>{today}</p>
        </div>
        <button
          className="btn btn-outline btn-sm"
          onClick={loadQueue}
          aria-label="Refresh queue"
        >
          <IconRefresh /> Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-error" role="alert" data-testid="error-message">
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="queue-stats-row">
        <div className="queue-stat waiting">
          <div className="queue-stat-value">{waiting.length}</div>
          <div className="queue-stat-label">Waiting</div>
        </div>
        <div className="queue-stat served">
          <div className="queue-stat-value">{served.length}</div>
          <div className="queue-stat-label">Served</div>
        </div>
        <div className="queue-stat total">
          <div className="queue-stat-value">{queue.length}</div>
          <div className="queue-stat-label">Total</div>
        </div>
      </div>

      {/* Progress bar */}
      {queue.length > 0 && (
        <div className="card" style={{ marginBottom: '20px', padding: '16px 20px' }}>
          <div className="queue-progress-header">
            <span className="queue-progress-label">Queue progress</span>
            <span className="queue-progress-pct">{served.length} of {queue.length} served — {servedPercent}%</span>
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
        </div>
      )}

      {queue.length === 0 ? (
        <div className="empty-state card">
          <h3>No patients in queue today</h3>
          <p>Appointments booked for today will appear here once confirmed.</p>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Queue Order</h2>
            <span className="badge badge-pending" style={{ fontSize: '0.8rem' }}>
              {waiting.length} waiting
            </span>
          </div>
          <div className="appt-list" data-testid="queue-list">
            {queue.map((a) => (
              <div
                className={`queue-item${a.status === 'served' ? ' served' : ''}`}
                key={a.id}
                data-testid="queue-item"
                data-id={a.id}
              >
                <div className={`queue-num-badge ${a.status}`}>
                  <span data-testid="queue-number">#{a.queue_number}</span>
                </div>
                <div className="appt-details" style={{ flex: 1 }}>
                  <div className="appt-doctor">{a.patient_name}</div>
                  <div className="appt-meta">
                    <span>{a.doctor}</span>
                    <span>·</span>
                    <span>{a.reason}</span>
                  </div>
                </div>
                <div className="appt-actions">
                  <StatusBadge status={a.status} />
                  {a.status !== 'served' && (
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleServe(a.id)}
                      disabled={serving === a.id}
                      data-testid="mark-served-btn"
                      aria-label={`Mark ${a.patient_name} as served`}
                    >
                      {serving === a.id ? 'Marking...' : 'Mark Served'}
                    </button>
                  )}
                  {a.status === 'served' && (
                    <span className="served-check" aria-label="Served">✓</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
