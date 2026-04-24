const request = require('supertest');
const app = require('../../src/app');
const { clearDatabase } = require('../setup');

let patientToken, patient2Token, staffToken;
let patientId, patient2Id;
let appointmentId;

const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
const pastDate = '2020-06-15';

beforeAll(async () => {
  clearDatabase();

  // Register patient 1
  let res = await request(app).post('/api/auth/register').send({
    name: 'Patient One',
    email: 'patient1@test.com',
    password: 'password123',
    role: 'patient',
  });
  patientToken = res.body.token;
  patientId = res.body.user.id;

  // Register patient 2
  res = await request(app).post('/api/auth/register').send({
    name: 'Patient Two',
    email: 'patient2@test.com',
    password: 'password123',
    role: 'patient',
  });
  patient2Token = res.body.token;
  patient2Id = res.body.user.id;

  // Register staff
  res = await request(app).post('/api/auth/register').send({
    name: 'Staff Member',
    email: 'staff@test.com',
    password: 'staffpass',
    role: 'staff',
  });
  staffToken = res.body.token;
});

afterAll(() => clearDatabase());

// ---------------------------------------------------------------------------
// Happy Path
// ---------------------------------------------------------------------------
describe('Appointments — Happy Path', () => {
  test('patient creates an appointment and queue number is assigned', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ doctor: 'Dr. Smith', date: tomorrow, reason: 'General checkup' });

    expect(res.status).toBe(201);
    expect(res.body.appointment).toMatchObject({
      doctor: 'Dr. Smith',
      date: tomorrow,
      reason: 'General checkup',
      status: 'pending',
    });
    expect(res.body.appointment.queue_number).toBe(1);
    appointmentId = res.body.appointment.id;
  });

  test('second appointment on same date gets next queue number', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patient2Token}`)
      .send({ doctor: 'Dr. Jones', date: tomorrow, reason: 'Follow-up' });

    expect(res.status).toBe(201);
    expect(res.body.appointment.queue_number).toBe(2);
  });

  test('patient fetches all appointments and only sees their own', async () => {
    const res = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.appointments)).toBe(true);
    res.body.appointments.forEach((a) => {
      expect(a.patient_id).toBe(patientId);
    });
  });

  test('staff fetches all appointments and sees all patients', async () => {
    const res = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.appointments.length).toBeGreaterThanOrEqual(2);
    const patientIds = res.body.appointments.map((a) => a.patient_id);
    expect(patientIds).toContain(patientId);
    expect(patientIds).toContain(patient2Id);
    // Staff response includes patient name
    expect(res.body.appointments[0]).toHaveProperty('patient_name');
  });

  test('patient fetches single appointment by ID', async () => {
    const res = await request(app)
      .get(`/api/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.appointment.id).toBe(appointmentId);
  });

  test('patient updates their appointment', async () => {
    const res = await request(app)
      .put(`/api/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ doctor: 'Dr. Brown', reason: 'Updated reason' });

    expect(res.status).toBe(200);
    expect(res.body.appointment.doctor).toBe('Dr. Brown');
    expect(res.body.appointment.reason).toBe('Updated reason');
  });
});

// ---------------------------------------------------------------------------
// Negative Cases
// ---------------------------------------------------------------------------
describe('Appointments — Negative Cases', () => {
  test('creating appointment with missing fields returns 400', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ doctor: 'Dr. X' }); // missing date and reason
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  test('patient accesses another patient appointment returns 403', async () => {
    // Get patient2's appointment id
    const list = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${patient2Token}`);
    const p2Appt = list.body.appointments[0];

    const res = await request(app)
      .get(`/api/appointments/${p2Appt.id}`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.status).toBe(403);
  });

  test('patient tries to update another patient appointment returns 403', async () => {
    const list = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${patient2Token}`);
    const p2Appt = list.body.appointments[0];

    const res = await request(app)
      .put(`/api/appointments/${p2Appt.id}`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ reason: 'Hacked' });
    expect(res.status).toBe(403);
  });

  test('patient tries to delete another patient appointment returns 403', async () => {
    const list = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${patient2Token}`);
    const p2Appt = list.body.appointments[0];

    const res = await request(app)
      .delete(`/api/appointments/${p2Appt.id}`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.status).toBe(403);
  });

  test('fetching non-existent appointment returns 404', async () => {
    const res = await request(app)
      .get('/api/appointments/99999')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------
describe('Appointments — Edge Cases', () => {
  test('booking appointment in the past is rejected (400)', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ doctor: 'Dr. Past', date: pastDate, reason: 'Should fail' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/past/i);
  });

  test('invalid date format is rejected with clear error (400)', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ doctor: 'Dr. Format', date: '25/12/2025', reason: 'Bad format' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/date format/i);
  });

  test('another invalid date format (MM-DD-YYYY)', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ doctor: 'Dr. Format', date: '12-25-2025', reason: 'Bad format' });
    expect(res.status).toBe(400);
  });

  test('duplicate booking same day is rejected (409)', async () => {
    // Patient1 already has appointment for tomorrow, second booking same day fails
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ doctor: 'Dr. Duplicate', date: tomorrow, reason: 'Same day again' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already have an appointment/i);
  });

  test('rescheduling to a past date is rejected (400)', async () => {
    const res = await request(app)
      .put(`/api/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ date: pastDate });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/past/i);
  });

  test('cancelling an appointment succeeds', async () => {
    // Create a fresh appointment for next week to cancel
    const create = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ doctor: 'Dr. Cancel', date: nextWeek, reason: 'To be cancelled' });
    const cancelId = create.body.appointment.id;

    const res = await request(app)
      .delete(`/api/appointments/${cancelId}`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/cancelled/i);
  });

  test('cancelling an already-cancelled appointment returns 400', async () => {
    const create = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ doctor: 'Dr. Double', date: '2026-06-01', reason: 'Double cancel' });
    const cancelId = create.body.appointment.id;

    await request(app)
      .delete(`/api/appointments/${cancelId}`)
      .set('Authorization', `Bearer ${patientToken}`);

    const res = await request(app)
      .delete(`/api/appointments/${cancelId}`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already cancelled/i);
  });

  test('re-booking on the same day after a cancellation is allowed', async () => {
    const targetDate = '2026-07-01';

    // Create and then cancel
    const create = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ doctor: 'Dr. Rebook', date: targetDate, reason: 'Will cancel' });
    const cancelId = create.body.appointment.id;

    await request(app)
      .delete(`/api/appointments/${cancelId}`)
      .set('Authorization', `Bearer ${patientToken}`);

    // Re-book same date — should succeed
    const rebook = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ doctor: 'Dr. Rebook', date: targetDate, reason: 'Re-booked after cancel' });
    expect(rebook.status).toBe(201);
    expect(rebook.body.appointment.date).toBe(targetDate);
  });
});
