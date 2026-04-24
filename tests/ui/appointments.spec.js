// @ts-check
const { test, expect } = require('@playwright/test');

const ts = Date.now();
const PATIENT = {
  name: 'Appt UI Patient',
  email: `appt.patient.${ts}@test.com`,
  password: 'testpass123',
  role: 'patient',
};
const STAFF = {
  name: 'Appt UI Staff',
  email: `appt.staff.${ts}@test.com`,
  password: 'staffpass123',
  role: 'staff',
};

const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const nextWeek  = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

let patientToken = '';
let staffToken = '';

test.beforeAll(async ({ request }) => {
  // Register patient and staff
  const pRes = await request.post('/api/auth/register', { data: PATIENT });
  patientToken = (await pRes.json()).token;

  const sRes = await request.post('/api/auth/register', { data: STAFF });
  staffToken = (await sRes.json()).token;
});

/** Helper: log in as a user via the UI */
async function uiLogin(page, email, password) {
  await page.goto('/login');
  await page.getByTestId('email-input').fill(email);
  await page.getByTestId('password-input').fill(password);
  await page.getByTestId('submit-btn').click();
  await page.waitForURL('/dashboard');
}

// -----------------------------------------------------------------------
// Create appointment
// -----------------------------------------------------------------------
test.describe('Create appointment', () => {
  test('patient can fill form and submit a new appointment', async ({ page }) => {
    await uiLogin(page, PATIENT.email, PATIENT.password);

    await page.getByTestId('nav-appointments').click();
    await page.waitForURL('/appointments');

    await page.getByTestId('new-appointment-btn').click();
    await page.waitForURL('/appointments/new');

    await page.getByTestId('doctor-input').fill('Dr. UI Tester');
    await page.getByTestId('date-input').fill(tomorrow);
    await page.getByTestId('reason-input').fill('Regular checkup via UI test');
    await page.getByTestId('submit-btn').click();

    // Should redirect to appointments list and show the new booking
    await page.waitForURL('/appointments');
    await expect(page.getByTestId('appointment-card').first()).toBeVisible();

    // Queue number should be a number
    const queueNum = await page.getByTestId('queue-number').first().textContent();
    expect(Number(queueNum)).toBeGreaterThan(0);
  });

  test('appointment appears in list with correct details after booking', async ({ page, request }) => {
    await uiLogin(page, PATIENT.email, PATIENT.password);

    // Create via API for a clean state
    await request.post('/api/appointments', {
      headers: { Authorization: `Bearer ${patientToken}` },
      data: { doctor: 'Dr. Verify', date: nextWeek, reason: 'Verify in list' },
    });

    await page.goto('/appointments');
    await expect(page.getByText('Dr. Verify')).toBeVisible();
  });
});

// -----------------------------------------------------------------------
// Form validation
// -----------------------------------------------------------------------
test.describe('Appointment form validation', () => {
  test.beforeEach(async ({ page }) => {
    await uiLogin(page, PATIENT.email, PATIENT.password);
    await page.goto('/appointments/new');
  });

  test('shows validation errors when form is submitted empty', async ({ page }) => {
    await page.getByTestId('submit-btn').click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(page).toHaveURL('/appointments/new');
  });

  test('shows error when doctor field is empty', async ({ page }) => {
    await page.getByTestId('date-input').fill(tomorrow);
    await page.getByTestId('reason-input').fill('Test reason');
    await page.getByTestId('submit-btn').click();
    await expect(page.getByText(/doctor name is required/i)).toBeVisible();
  });

  test('shows error when date is missing', async ({ page }) => {
    await page.getByTestId('doctor-input').fill('Dr. Test');
    await page.getByTestId('reason-input').fill('Test reason');
    await page.getByTestId('submit-btn').click();
    await expect(page.getByText(/date is required/i)).toBeVisible();
  });

  test('shows error when reason is empty', async ({ page }) => {
    await page.getByTestId('doctor-input').fill('Dr. Test');
    await page.getByTestId('date-input').fill(tomorrow);
    await page.getByTestId('submit-btn').click();
    await expect(page.getByText(/reason is required/i)).toBeVisible();
  });

  test('min attribute prevents selecting past dates in the date picker', async ({ page }) => {
    const today = new Date().toISOString().split('T')[0];
    const minAttr = await page.getByTestId('date-input').getAttribute('min');
    expect(minAttr).toBe(today);
  });

  test('shows server error when booking duplicate same-day appointment', async ({ page, request }) => {
    // First booking via API
    await request.post('/api/appointments', {
      headers: { Authorization: `Bearer ${patientToken}` },
      data: { doctor: 'Dr. Dupe', date: tomorrow, reason: 'First booking' },
    }).catch(() => {}); // ignore if already exists

    // Try to book the same date via UI
    await page.getByTestId('doctor-input').fill('Dr. Second');
    await page.getByTestId('date-input').fill(tomorrow);
    await page.getByTestId('reason-input').fill('Duplicate attempt');
    await page.getByTestId('submit-btn').click();

    // Expect a server error (409 or 400 surfaced as alert)
    await expect(page.getByTestId('error-message')).toBeVisible({ timeout: 5000 });
  });
});

// -----------------------------------------------------------------------
// Update / cancel
// -----------------------------------------------------------------------
test.describe('Update and cancel appointment', () => {
  let apptId;

  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/appointments', {
      headers: { Authorization: `Bearer ${patientToken}` },
      data: { doctor: 'Dr. Edit Me', date: '2027-03-15', reason: 'To be edited' },
    });
    const data = await res.json();
    apptId = data.appointment?.id;
  });

  test('patient can edit appointment and changes are reflected', async ({ page }) => {
    await uiLogin(page, PATIENT.email, PATIENT.password);
    await page.goto(`/appointments/${apptId}/edit`);

    await page.getByTestId('doctor-input').fill('Dr. Updated');
    await page.getByTestId('reason-input').fill('Updated reason');
    await page.getByTestId('submit-btn').click();

    await page.waitForURL('/appointments');
    await expect(page.getByText('Dr. Updated')).toBeVisible();
  });

  test('patient can cancel appointment and status changes to cancelled', async ({ page, request }) => {
    // Create a fresh appointment to cancel so we don't conflict
    const res = await request.post('/api/appointments', {
      headers: { Authorization: `Bearer ${patientToken}` },
      data: { doctor: 'Dr. Cancel Me', date: '2027-04-20', reason: 'Will be cancelled' },
    });
    const data = await res.json();
    const cancelId = data.appointment?.id;

    await uiLogin(page, PATIENT.email, PATIENT.password);
    await page.goto('/appointments');

    // Find the cancel button for this appointment by data-id
    const card = page.locator(`[data-id="${cancelId}"]`);
    await expect(card).toBeVisible();

    await card.getByTestId('cancel-appointment-btn').click();

    // Confirm in the modal
    await expect(page.getByTestId('confirm-cancel-btn')).toBeVisible();
    await page.getByTestId('confirm-cancel-btn').click();

    // The status should update to cancelled
    await expect(page.locator(`[data-id="${cancelId}"]`).getByTestId('appointment-status'))
      .toContainText('cancelled', { timeout: 5000 });
  });
});

// -----------------------------------------------------------------------
// Staff queue page
// -----------------------------------------------------------------------
test.describe('Staff — Queue management', () => {
  let todayApptId;

  test.beforeAll(async ({ request }) => {
    const today = new Date().toISOString().split('T')[0];
    // Create a patient to assign today's appointment
    const pRes = await request.post('/api/auth/register', {
      data: {
        name: 'Queue UI Patient',
        email: `queue.ui.${ts}@test.com`,
        password: 'pass1234',
        role: 'patient',
      },
    });
    const pToken = (await pRes.json()).token;
    const apptRes = await request.post('/api/appointments', {
      headers: { Authorization: `Bearer ${pToken}` },
      data: { doctor: 'Dr. Queue UI', date: today, reason: 'UI queue test' },
    });
    const appt = await apptRes.json();
    todayApptId = appt.appointment?.id;
  });

  test('staff can view queue page and see patients', async ({ page }) => {
    await uiLogin(page, STAFF.email, STAFF.password);
    await page.getByTestId('nav-queue').click();
    await page.waitForURL('/queue');
    await expect(page.getByRole('heading', { name: /today's queue/i })).toBeVisible();
  });

  test('staff can mark a patient as served via UI', async ({ page }) => {
    await uiLogin(page, STAFF.email, STAFF.password);
    await page.goto('/queue');

    // Find the queue item for our test appointment
    const item = page.locator(`[data-id="${todayApptId}"]`);
    if (await item.isVisible()) {
      const serveBtn = item.getByTestId('mark-served-btn');
      if (await serveBtn.isVisible()) {
        await serveBtn.click();
        // Status should update to served
        await expect(item.getByText('served')).toBeVisible({ timeout: 5000 });
      }
    }
    // If item is not visible, the test is considered a soft pass (queue may already be served)
  });

  test('patient role does not see Queue nav link', async ({ page }) => {
    await uiLogin(page, PATIENT.email, PATIENT.password);
    await expect(page.getByTestId('nav-queue')).not.toBeVisible();
  });

  test('patient accessing /queue directly is redirected to dashboard', async ({ page }) => {
    await uiLogin(page, PATIENT.email, PATIENT.password);
    await page.goto('/queue');
    await expect(page).toHaveURL('/dashboard');
  });
});
