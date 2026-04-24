import { useState, useEffect } from 'react';
import api from '../api/client';
import Spinner from '../components/Spinner';

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>;
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Today's Queue</h1>
          <p>{today}</p>
        </div>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => { setLoading(true); loadQueue(); }}
          aria-label="Refresh queue"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-error" role="alert" data-testid="error-message">
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div className="stat-card" style={{ flex: '1', minWidth: '140px' }}>
          <div className="stat-label">Waiting</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{waiting.length}</div>
        </div>
        <div className="stat-card" style={{ flex: '1', minWidth: '140px' }}>
          <div className="stat-label">Served</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>{served.length}</div>
        </div>
        <div className="stat-card" style={{ flex: '1', minWidth: '140px' }}>
          <div className="stat-label">Total</div>
          <div className="stat-value">{queue.length}</div>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="empty-state card">
          <h3>No patients in queue today</h3>
          <p>Appointments booked for today will appear here.</p>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Queue Order</h2>
          </div>
          <div className="appt-list" data-testid="queue-list">
            {queue.map((a) => (
              <div
                className={`queue-item${a.status === 'served' ? ' served' : ''}`}
                key={a.id}
                data-testid="queue-item"
                data-id={a.id}
              >
                <div className={`appt-queue-num ${a.status}`}>
                  <span data-testid="queue-number">{a.queue_number}</span>
                </div>
                <div className="appt-details" style={{ flex: 1 }}>
                  <div className="appt-doctor">{a.patient_name}</div>
                  <div className="appt-meta">
                    <span>{a.doctor}</span>
                    <span>{a.reason}</span>
                  </div>
                </div>
                <div className="appt-actions">
                  <StatusBadge status={a.status} />
                  {a.status !== 'served' && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleServe(a.id)}
                      disabled={serving === a.id}
                      data-testid="mark-served-btn"
                      aria-label={`Mark ${a.patient_name} as served`}
                    >
                      {serving === a.id ? 'Marking...' : 'Mark served'}
                    </button>
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
