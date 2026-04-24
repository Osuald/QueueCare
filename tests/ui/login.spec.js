// @ts-check
const { test, expect } = require('@playwright/test');

// Use a timestamp-based suffix so each run uses fresh, unique credentials
const ts = Date.now();
const TEST_USER = {
  name: 'UI Test Patient',
  email: `ui.patient.${ts}@test.com`,
  password: 'testpass123',
  role: 'patient',
};

// Register the test user via API before the login tests run
test.beforeAll(async ({ request }) => {
  await request.post('/api/auth/register', { data: TEST_USER });
});

// -----------------------------------------------------------------------
// Login flow
// -----------------------------------------------------------------------
test.describe('Login — valid credentials', () => {
  test('logs in and redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/QueueCare/i);

    await page.getByTestId('email-input').fill(TEST_USER.email);
    await page.getByTestId('password-input').fill(TEST_USER.password);
    await page.getByTestId('submit-btn').click();

    await expect(page).toHaveURL('/dashboard');
    // Navbar should now show the logged-in user
    await expect(page.getByRole('navigation')).toContainText('UI Test Patient');
  });

  test('dashboard shows welcome message with user name', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('email-input').fill(TEST_USER.email);
    await page.getByTestId('password-input').fill(TEST_USER.password);
    await page.getByTestId('submit-btn').click();

    await page.waitForURL('/dashboard');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome back');
  });
});

test.describe('Login — invalid credentials', () => {
  test('shows error for wrong password', async ({ page }) => {
    await page.goto('/login');

    await page.getByTestId('email-input').fill(TEST_USER.email);
    await page.getByTestId('password-input').fill('definitely-wrong-password');
    await page.getByTestId('submit-btn').click();

    await expect(page.getByTestId('error-message')).toBeVisible();
    await expect(page.getByTestId('error-message')).toContainText(/invalid/i);
    // Should stay on login page
    await expect(page).toHaveURL('/login');
  });

  test('shows error for non-existent email', async ({ page }) => {
    await page.goto('/login');

    await page.getByTestId('email-input').fill('nobody@nowhere-at-all.com');
    await page.getByTestId('password-input').fill('anything123');
    await page.getByTestId('submit-btn').click();

    await expect(page.getByTestId('error-message')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Login — form validation (empty submission)', () => {
  test('shows field errors when form is submitted empty', async ({ page }) => {
    await page.goto('/login');

    // Submit without filling anything
    await page.getByTestId('submit-btn').click();

    // Both field-level errors should appear
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('shows email error when only password is filled', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('password-input').fill('somepassword');
    await page.getByTestId('submit-btn').click();

    await expect(page.getByText(/email is required/i)).toBeVisible();
  });

  test('shows password error when only email is filled', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('email-input').fill(TEST_USER.email);
    await page.getByTestId('submit-btn').click();

    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test('shows invalid email error for bad email format', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('email-input').fill('notanemail');
    await page.getByTestId('password-input').fill('pass');
    await page.getByTestId('submit-btn').click();

    await expect(page.getByText(/valid email/i)).toBeVisible();
  });
});

test.describe('Logout', () => {
  test('logout clears session and redirects to login', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('email-input').fill(TEST_USER.email);
    await page.getByTestId('password-input').fill(TEST_USER.password);
    await page.getByTestId('submit-btn').click();
    await page.waitForURL('/dashboard');

    await page.getByTestId('logout-btn').click();
    await expect(page).toHaveURL('/login');
  });

  test('accessing dashboard after logout redirects to login', async ({ page }) => {
    // Navigate to login and log in first
    await page.goto('/login');
    await page.getByTestId('email-input').fill(TEST_USER.email);
    await page.getByTestId('password-input').fill(TEST_USER.password);
    await page.getByTestId('submit-btn').click();
    await page.waitForURL('/dashboard');

    await page.getByTestId('logout-btn').click();
    await page.waitForURL('/login');

    // Try to visit dashboard directly
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Navigation link to register', () => {
  test('login page links to registration page', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('register-link').click();
    await expect(page).toHaveURL('/register');
  });
});
