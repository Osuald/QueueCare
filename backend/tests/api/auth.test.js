const request = require('supertest');
const app = require('../../src/app');
const { clearDatabase } = require('../setup');

beforeAll(() => clearDatabase());
afterAll(() => clearDatabase());

describe('Auth — Registration', () => {
  test('registers a new patient user successfully', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice Patient',
      email: 'alice@test.com',
      password: 'password123',
      role: 'patient',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({
      name: 'Alice Patient',
      email: 'alice@test.com',
      role: 'patient',
    });
    expect(res.body.user).not.toHaveProperty('password');
  });

  test('registers a staff user successfully', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bob Staff',
      email: 'bob.staff@test.com',
      password: 'staffpass',
      role: 'staff',
    });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('staff');
  });

  test('rejects duplicate email with 400', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Duplicate',
      email: 'duplicate@test.com',
      password: 'pass123',
    });

    const res = await request(app).post('/api/auth/register').send({
      name: 'Duplicate Again',
      email: 'duplicate@test.com',
      password: 'pass456',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already registered/i);
  });

  test('rejects registration with missing name', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'noname@test.com',
      password: 'pass123',
    });
    expect(res.status).toBe(400);
  });

  test('rejects registration with missing email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'No Email',
      password: 'pass123',
    });
    expect(res.status).toBe(400);
  });

  test('rejects registration with short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Short Pass',
      email: 'short@test.com',
      password: '123',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password/i);
  });
});

describe('Auth — Login', () => {
  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Login Test',
      email: 'logintest@test.com',
      password: 'correctpass',
      role: 'patient',
    });
  });

  test('logs in with correct credentials and returns a valid token', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'logintest@test.com',
      password: 'correctpass',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toMatchObject({ email: 'logintest@test.com', role: 'patient' });
  });

  test('rejects login with wrong password (401)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'logintest@test.com',
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  test('rejects login with non-existent email (401)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'ghost@nowhere.com',
      password: 'anything',
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  test('rejects login with missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'logintest@test.com' });
    expect(res.status).toBe(400);
  });
});

describe('Auth — Protected endpoint access', () => {
  test('rejects request with no token (401)', async () => {
    const res = await request(app).get('/api/appointments');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/no token/i);
  });

  test('rejects request with invalid token (401)', async () => {
    const res = await request(app)
      .get('/api/appointments')
      .set('Authorization', 'Bearer this.is.not.valid');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  test('rejects request with malformed Authorization header (401)', async () => {
    const res = await request(app)
      .get('/api/appointments')
      .set('Authorization', 'NotBearer sometoken');
    expect(res.status).toBe(401);
  });
});
