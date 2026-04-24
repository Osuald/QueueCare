const express = require('express');
const db = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function isValidDateStr(str) {
  if (!DATE_REGEX.test(str)) return false;
  const d = new Date(str);
  return !isNaN(d.getTime()) && d.toISOString().split('T')[0] === str;
}

function isPast(dateStr) {
  return dateStr < getToday();
}

function getNextQueueNumber(date) {
  const row = db
    .prepare(
      `SELECT COALESCE(MAX(queue_number), 0) + 1 AS next_num
       FROM appointments WHERE date = ? AND status != 'cancelled'`
    )
    .get(date);
  return row.next_num;
}

// All routes require authentication
router.use(authenticate);

// POST /api/appointments
router.post('/', (req, res) => {
  const { doctor, date, reason } = req.body;

  if (!doctor || !date || !reason) {
    return res.status(400).json({ error: 'Doctor, date and reason are required' });
  }
  if (!isValidDateStr(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
  }
  if (isPast(date)) {
    return res.status(400).json({ error: 'Cannot book an appointment in the past' });
  }

  const patientId = req.user.id;
  const duplicate = db
    .prepare(
      `SELECT id FROM appointments
       WHERE patient_id = ? AND date = ? AND status NOT IN ('cancelled')`
    )
    .get(patientId, date);

  if (duplicate) {
    return res.status(409).json({ error: 'You already have an appointment on this date' });
  }

  const queueNumber = getNextQueueNumber(date);
  const result = db
    .prepare(
      `INSERT INTO appointments (patient_id, doctor, date, reason, queue_number)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(patientId, doctor.trim(), date, reason.trim(), queueNumber);

  const appointment = db
    .prepare('SELECT * FROM appointments WHERE id = ?')
    .get(result.lastInsertRowid);

  return res.status(201).json({ message: 'Appointment created', appointment });
});

// GET /api/appointments
router.get('/', (req, res) => {
  let appointments;

  if (req.user.role === 'patient') {
    appointments = db
      .prepare(
        `SELECT * FROM appointments WHERE patient_id = ? ORDER BY date ASC, queue_number ASC`
      )
      .all(req.user.id);
  } else {
    appointments = db
      .prepare(
        `SELECT a.*, u.name AS patient_name, u.email AS patient_email
         FROM appointments a
         JOIN users u ON a.patient_id = u.id
         ORDER BY a.date ASC, a.queue_number ASC`
      )
      .all();
  }

  return res.status(200).json({ appointments });
});

// GET /api/appointments/:id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const appointment = db
    .prepare(
      `SELECT a.*, u.name AS patient_name, u.email AS patient_email
       FROM appointments a JOIN users u ON a.patient_id = u.id
       WHERE a.id = ?`
    )
    .get(id);

  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  if (req.user.role === 'patient' && appointment.patient_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  return res.status(200).json({ appointment });
});

// PUT /api/appointments/:id
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);

  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  if (req.user.role === 'patient' && appointment.patient_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (appointment.status === 'cancelled') {
    return res.status(400).json({ error: 'Cannot update a cancelled appointment' });
  }
  if (appointment.status === 'served') {
    return res.status(400).json({ error: 'Cannot update an appointment that is already served' });
  }

  const { doctor, date, reason } = req.body;
  const newDoctor = doctor ? doctor.trim() : appointment.doctor;
  const newDate = date || appointment.date;
  const newReason = reason ? reason.trim() : appointment.reason;

  if (date) {
    if (!isValidDateStr(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    if (isPast(date)) {
      return res.status(400).json({ error: 'Cannot reschedule to a past date' });
    }

    // Check duplicate only if date changed
    if (date !== appointment.date) {
      const duplicate = db
        .prepare(
          `SELECT id FROM appointments
           WHERE patient_id = ? AND date = ? AND status NOT IN ('cancelled') AND id != ?`
        )
        .get(appointment.patient_id, date, id);
      if (duplicate) {
        return res.status(409).json({ error: 'Patient already has an appointment on this date' });
      }
    }
  }

  let newQueueNumber = appointment.queue_number;
  if (date && date !== appointment.date) {
    newQueueNumber = getNextQueueNumber(date);
  }

  db.prepare(
    `UPDATE appointments
     SET doctor = ?, date = ?, reason = ?, queue_number = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(newDoctor, newDate, newReason, newQueueNumber, id);

  const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  return res.status(200).json({ message: 'Appointment updated', appointment: updated });
});

// DELETE /api/appointments/:id  (cancel)
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);

  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  if (req.user.role === 'patient' && appointment.patient_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (appointment.status === 'cancelled') {
    return res.status(400).json({ error: 'Appointment is already cancelled' });
  }

  db.prepare(
    `UPDATE appointments SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(id);

  return res.status(200).json({ message: 'Appointment cancelled' });
});

module.exports = router;
