import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../api/client';

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function AppointmentForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({ doctor: '', date: '', reason: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/appointments/${id}`)
      .then((res) => {
        const a = res.data.appointment;
        setForm({ doctor: a.doctor, date: a.date, reason: a.reason });
      })
      .catch(() => setServerError('Appointment not found.'))
      .finally(() => setFetching(false));
  }, [id, isEdit]);

  function validate() {
    const e = {};
    if (!form.doctor.trim()) e.doctor = 'Doctor name is required';
    if (!form.date) e.date = 'Date is required';
    else if (form.date < getTodayStr()) e.date = 'Date cannot be in the past';
    if (!form.reason.trim()) e.reason = 'Reason is required';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setServerError('');
    setSuccess('');
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/appointments/${id}`, form);
        setSuccess('Appointment updated successfully.');
        setTimeout(() => navigate('/appointments'), 1200);
      } else {
        await api.post('/appointments', form);
        setSuccess('Appointment booked successfully.');
        setTimeout(() => navigate('/appointments'), 1200);
      }
    } catch (err) {
      setServerError(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  if (fetching) return <div className="spinner-wrap"><div className="spinner" /></div>;

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1>{isEdit ? 'Edit Appointment' : 'Book Appointment'}</h1>
          <p>{isEdit ? 'Update the appointment details below.' : 'Fill in the details to book your appointment.'}</p>
        </div>
        <Link to="/appointments" className="btn btn-ghost btn-sm">
          Back
        </Link>
      </div>

      <div className="card">
        {serverError && (
          <div className="alert alert-error" data-testid="error-message" role="alert">
            {serverError}
          </div>
        )}
        {success && (
          <div className="alert alert-success" data-testid="success-message" role="status">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate data-testid="appointment-form">
          <div className="form-group">
            <label htmlFor="doctor">Doctor</label>
            <input
              id="doctor"
              type="text"
              value={form.doctor}
              onChange={(e) => setForm((f) => ({ ...f, doctor: e.target.value }))}
              className={errors.doctor ? 'error' : ''}
              data-testid="doctor-input"
              placeholder="e.g. Dr. Sarah Ahmed"
            />
            {errors.doctor && <span className="field-error" role="alert">{errors.doctor}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              value={form.date}
              min={getTodayStr()}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className={errors.date ? 'error' : ''}
              data-testid="date-input"
            />
            {errors.date && <span className="field-error" role="alert">{errors.date}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="reason">Reason for visit</label>
            <textarea
              id="reason"
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              className={errors.reason ? 'error' : ''}
              data-testid="reason-input"
              placeholder="Brief description of your visit..."
              rows={4}
            />
            {errors.reason && <span className="field-error" role="alert">{errors.reason}</span>}
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <Link to="/appointments" className="btn btn-ghost">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              data-testid="submit-btn"
            >
              {loading
                ? isEdit ? 'Saving...' : 'Booking...'
                : isEdit ? 'Save changes' : 'Book appointment'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
