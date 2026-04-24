const express = require('express');
const db = require('../config/database');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

function getToday() {
  return new Date().toISOString().split('T')[0];
}

// GET /api/queue/today — all authenticated users can view today's queue
router.get('/today', authenticate, (req, res) => {
  const today = getToday();

  const queue = db
    .prepare(
      `SELECT a.*, u.name AS patient_name, u.email AS patient_email
       FROM appointments a
       JOIN users u ON a.patient_id = u.id
       WHERE a.date = ? AND a.status != 'cancelled'
       ORDER BY a.queue_number ASC`
    )
    .all(today);

  return res.status(200).json({ queue, date: today });
});

// PATCH /api/queue/:id/serve — staff/admin only
router.patch('/:id/serve', authenticate, requireRole('staff', 'admin'), (req, res) => {
  const { id } = req.params;

  const appointment = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  if (appointment.status === 'served') {
    return res.status(400).json({ error: 'Patient is already marked as served' });
  }
  if (appointment.status === 'cancelled') {
    return res.status(400).json({ error: 'Cannot serve a cancelled appointment' });
  }

  db.prepare(
    `UPDATE appointments SET status = 'served', updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(id);

  const updated = db
    .prepare(
      `SELECT a.*, u.name AS patient_name
       FROM appointments a JOIN users u ON a.patient_id = u.id
       WHERE a.id = ?`
    )
    .get(id);

  return res.status(200).json({ message: 'Patient marked as served', appointment: updated });
});

module.exports = router;
