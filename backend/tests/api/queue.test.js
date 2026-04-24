const request = require('supertest');
const app = require('../../src/app');
const { clearDatabase } = require('../setup');

let patientToken, staffToken, adminToken;
let todayAppointmentId;

const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

beforeAll(async () => {
  clearDatabase();

  let res = await request(app).post('/api/auth/register').send({
    name: 'Queue Patient',
    email: 'qpatient@test.com',
    password: 'pass1234',
    role: 'patient',
  });
  patientToken = res.body.token;

  res = await request(app).post('/api/auth/register').send({
    name: 'Queue Staff',
    email: 'qstaff@test.com',
    password: 'pass1234',
    role: 'staff',
  });
  staffToken = res.body.token;

  res = await request(app).post('/api/auth/register').send({
    name: 'Queue Admin',
    email: 'qadmin@test.com',
    password: 'pass1234',
    role: 'admin',
  });
  adminToken = res.body.token;

  // Create an appointment for TODAY so the queue is not empty
  const appt = await request(app)
    .post('/api/appointments')
    .set('Authorization', `Bearer ${patientToken}`)
    .send({ doctor: 'Dr. Queue', date: today, reason: 'Queue test' });
  todayAppointmentId = appt.body.appointment.id;
});

afterAll(() => clearDatabase());

// ---------------------------------------------------------------------------
// Happy Path
// ---------------------------------------------------------------------------
describe('Queue — Happy Path', () => {
  test('any authenticated user can view today queue', async () => {
    const res = await request(app)
      .get('/api/queue/today')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('queue');
    expect(res.body).toHaveProperty('date', today);
    expect(Array.isArray(res.body.queue)).toBe(true);
  });

  test("today's queue is ordered by queue number", async () => {
    // Add a second appointment for today from a second patient
    const res2 = await request(app).post('/api/auth/register').send({
      name: 'Queue Patient 2',
      email: 'qp2@test.com',
      password: 'pass1234',
      role: 'patient',
    });
    const p2Token = res2.body.token;
    await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${p2Token}`)
      .send({ doctor: 'Dr. Queue', date: today, reason: 'Second patient' });

    const res = await request(app)
      .get('/api/queue/today')
      .set('Authorization', `Bearer ${staffToken}`);

    const { queue } = res.body;
    for (let i = 1; i < queue.length; i++) {
      expect(queue[i].queue_number).toBeGreaterThan(queue[i - 1].queue_number);
    }
  });

  test("today's queue excludes cancelled appointments", async () => {
    // Create and immediately cancel an appointment for today
    const cancelRes = await request(app).post('/api/auth/register').send({
      name: 'Cancel Patient',
      email: 'cancel.q@test.com',
      password: 'pass1234',
      role: 'patient',
    });
    const cancelToken = cancelRes.body.token;

    const appt = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${cancelToken}`)
      .send({ doctor: 'Dr. X', date: today, reason: 'Cancel me' });

    const cancelId = appt.body.appointment.id;
    await request(app)
      .delete(`/api/appointments/${cancelId}`)
      .set('Authorization', `Bearer ${cancelToken}`);

    const res = await request(app)
      .get('/api/queue/today')
      .set('Authorization', `Bearer ${staffToken}`);

    const ids = res.body.queue.map((a) => a.id);
    expect(ids).not.toContain(cancelId);
  });

  test('staff marks patient as served and status updates', async () => {
    const res = await request(app)
      .patch(`/api/queue/${todayAppointmentId}/serve`)
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe('served');
    expect(res.body.message).toMatch(/served/i);
  });

  test('admin can also mark patient as served', async () => {
    // Create another appointment for today to serve
    const p3Res = await request(app).post('/api/auth/register').send({
      name: 'Admin Test Patient',
      email: 'adminp@test.com',
      password: 'pass1234',
      role: 'patient',
    });
    const p3Token = p3Res.body.token;

    const appt = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${p3Token}`)
      .send({ doctor: 'Dr. Admin', date: today, reason: 'Admin serve test' });

    const res = await request(app)
      .patch(`/api/queue/${appt.body.appointment.id}/serve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe('served');
  });
});

// ---------------------------------------------------------------------------
// Negative Cases
// ---------------------------------------------------------------------------
describe('Queue — Negative Cases', () => {
  test('unauthenticated request to today queue returns 401', async () => {
    const res = await request(app).get('/api/queue/today');
    expect(res.status).toBe(401);
  });

  test('patient tries to mark as served returns 403', async () => {
    const res = await request(app)
      .patch(`/api/queue/${todayAppointmentId}/serve`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/insufficient permissions/i);
  });

  test('marking already-served appointment returns 400', async () => {
    // todayAppointmentId was already served in happy path test above
    const res = await request(app)
      .patch(`/api/queue/${todayAppointmentId}/serve`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already.*served/i);
  });

  test('marking non-existent appointment as served returns 404', async () => {
    const res = await request(app)
      .patch('/api/queue/99999/serve')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(404);
  });

  test('marking a cancelled appointment as served returns 400', async () => {
    // Create an appointment, cancel it, then try to serve it
    const pRes = await request(app).post('/api/auth/register').send({
      name: 'Cancel Serve',
      email: 'cancelserve@test.com',
      password: 'pass1234',
      role: 'patient',
    });
    const pToken = pRes.body.token;

    const appt = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${pToken}`)
      .send({ doctor: 'Dr. CS', date: today, reason: 'Cancel then serve' });

    const apptId = appt.body.appointment.id;

    await request(app)
      .delete(`/api/appointments/${apptId}`)
      .set('Authorization', `Bearer ${pToken}`);

    const res = await request(app)
      .patch(`/api/queue/${apptId}/serve`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cancelled/i);
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------
describe('Queue — Edge Cases', () => {
  test("tomorrow's appointments do not appear in today's queue", async () => {
    const p4Res = await request(app).post('/api/auth/register').send({
      name: 'Tomorrow Patient',
      email: 'tomorrow.q@test.com',
      password: 'pass1234',
      role: 'patient',
    });
    const p4Token = p4Res.body.token;

    const appt = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${p4Token}`)
      .send({ doctor: 'Dr. Tomorrow', date: tomorrow, reason: 'Future' });

    const res = await request(app)
      .get('/api/queue/today')
      .set('Authorization', `Bearer ${staffToken}`);

    const ids = res.body.queue.map((a) => a.id);
    expect(ids).not.toContain(appt.body.appointment.id);
  });
});
