# QueueCare — Test Report

**Author:** Munyembuga (munyembuga_222014445@stud.ur.ac.rw)  
**Date:** April 2026  
**Stack:** Node.js · Express · SQLite (better-sqlite3) · React · Vite · Jest · Supertest · Playwright

---

## What I Built

### Architecture

A standard three-tier web application:

- **Backend** — Express REST API on port 5000. Routes are split by domain: `auth`, `appointments`, `queue`. JWT-based authentication with `bcryptjs` for password hashing. `better-sqlite3` for synchronous SQLite access — chosen because it eliminates async callback complexity and is perfectly adequate for a single-server clinic tool.
- **Database** — SQLite stored in `backend/data/queuecare.db`. Two tables: `users` and `appointments`. For tests, an in-memory database (`:memory:`) is used so tests are self-contained and leave no files behind.
- **Frontend** — React 18 + Vite, with React Router v6. No CSS framework — custom properties with a 60/30/10 white/teal/dark scheme. Role-aware UI: patients see their own appointments and the booking form; staff additionally see the queue management page.

### Key design decisions

| Decision | Reason |
|----------|--------|
| In-memory DB for API tests | Tests run in the same Node process with `--runInBand`, so a shared in-memory store is fast and automatically discarded |
| Queue numbers use `MAX + 1` (not `COUNT + 1`) | Cancellations leave gaps in COUNT; MAX guarantees new numbers are always unique |
| `status` field CHECK constraint in SQLite | Prevents invalid statuses being written by direct DB access, not just the API |
| JWT expiry of 24 h | Balances session longevity for patients with basic security |
| Role registered freely | Per the spec; flagged as a security weakness in the bugs section below |

---

## What I Tested

### API Tests — 3 suites, ~40 test cases

#### `auth.test.js`
- Successful registration (patient, staff roles)
- Duplicate email rejection
- Missing required fields (name, email, password)
- Short password rejection
- Successful login → valid JWT returned
- Wrong password → 401
- Non-existent email → 401
- Access protected endpoint without token → 401
- Access with invalid/malformed token → 401

#### `appointments.test.js`
- Create appointment → queue number assigned sequentially
- Second appointment on same date gets incremented queue number
- Patient sees only their own appointments (role-based filtering)
- Staff sees all appointments including patient name
- Fetch single appointment by ID (own)
- Patient accesses another patient's appointment → 403
- Patient updates another patient's appointment → 403
- Patient deletes another patient's appointment → 403
- Update own appointment
- Create with missing fields → 400
- Fetch non-existent ID → 404
- Book in the past → 400
- Invalid date format (`25/12/2025`, `12-25-2025`) → 400
- Duplicate booking same day → 409
- Reschedule to past date → 400
- Cancel appointment → success
- Cancel already-cancelled appointment → 400
- Re-book same day after cancellation → 201 (allowed)

#### `queue.test.js`
- GET today's queue — authenticated user
- Queue ordered by queue_number ASC
- Cancelled appointments excluded from queue
- Staff marks patient as served → status = 'served'
- Admin can also mark as served
- Tomorrow's appointments not in today's queue
- Unauthenticated GET → 401
- Patient tries to mark as served → 403
- Mark already-served → 400
- Mark non-existent appointment → 404
- Mark cancelled appointment as served → 400

### UI Tests — 2 spec files, ~20 test cases

#### `login.spec.js`
- Successful login redirects to dashboard
- Dashboard shows user name after login
- Wrong password shows error
- Non-existent email shows error
- Empty form shows field-level validation errors
- Only password filled → email error
- Only email filled → password error
- Bad email format shows validation error
- Logout clears session and redirects to login
- Accessing dashboard after logout redirects to login
- Register link navigates to register page

#### `appointments.spec.js`
- Patient books appointment via form → appears in list with queue number
- Booked appointment appears in list with correct details
- Empty form shows validation errors
- Empty doctor field → error
- Empty date field → error
- Empty reason field → error
- Date input `min` attribute prevents selecting past dates
- Duplicate same-day booking shows server error
- Patient edits appointment → changes reflected in list
- Patient cancels appointment → status changes to 'cancelled'
- Staff can view queue page
- Staff can mark patient as served via UI
- Patient does not see Queue nav link
- Patient accessing `/queue` directly is redirected

---

## What I Automated

### Fully automated
All happy-path, negative, and most edge-case scenarios are automated via Jest + Supertest (API) and Playwright (UI).

### Manually tested / not automated
| Scenario | Why not automated |
|----------|------------------|
| UI registration form full flow | Registration is tested at the API level; UI tests use the API for setup to avoid flakiness from state carry-over |
| Concurrent queue-number assignment (race condition) | Requires deliberate concurrency simulation; covered in the bugs section as a known design limitation |
| JWT expiry behaviour (token valid, then expires after 24 h) | Would require time-mocking or a very long wait; documented as a known limitation |
| Cross-browser testing | Playwright config runs Chromium only; Firefox and WebKit are straightforward to add |

---

## Bugs Found

### Bug 1 — Race condition in queue number assignment *(medium)*

**Description:** The queue number is assigned by reading `MAX(queue_number) + 1` in a single `SELECT`. Under concurrent requests for the same date, two requests arriving simultaneously could read the same MAX value and both receive the same queue number.

**Reproduction:** Send two simultaneous POST `/api/appointments` requests for the same date with different patients. Occasionally both receive `queue_number = 1`.

**Impact:** Queue ordering becomes ambiguous for two patients. The queue page would show two patients with the same number.

**Fix:** Use a SQLite transaction and row-level lock, or a date-scoped counter table updated atomically.

---

### Bug 2 — Any user can self-assign the 'admin' role on registration *(high — security)*

**Description:** The `POST /api/auth/register` endpoint accepts a `role` field from the request body. Any user can register as `admin` or `staff` without verification.

**Reproduction:**
```json
POST /api/auth/register
{ "name": "Hacker", "email": "h@x.com", "password": "pass123", "role": "admin" }
```
Response: `201` with `role: "admin"`.

**Impact:** A malicious user can gain staff/admin access and mark appointments as served, view all patients, or cancel any appointment.

**Fix:** Only allow `role: "patient"` during public registration. Admin/staff accounts should be created by an existing admin through a separate, protected endpoint.

---

### Bug 3 — Updating an appointment to the same date does not trigger a duplicate check *(low)*

**Description:** When a patient reschedules to the *same date they already have*, the duplicate check condition `date != appointment.date` skips the check. Because the appointment's date doesn't change, no conflict is detected. In isolation this is correct, but if the patient has a *second*, *cancelled* appointment on that date that was later re-booked by staff, duplicate data could accumulate.

**Impact:** Low under normal usage; only manifests with multi-step edge-case state.

**Fix:** Remove the `date !== appointment.date` early return guard and always run the duplicate check (excluding the current appointment by ID).

---

### Bug 4 — No input sanitisation for doctor/reason fields *(low — injection concern)*

**Description:** The `doctor` and `reason` fields are stored and returned verbatim. While the app does not render HTML server-side, a React frontend using `dangerouslySetInnerHTML` (it currently does not) would be vulnerable to stored XSS.

**Impact:** Currently low — React escapes output by default. Would become high if the frontend is ever modified to render raw HTML from API responses.

**Fix:** Add a simple `sanitize()` helper that strips HTML tags before insertion, or enforce a maximum field length to reduce attack surface.

---

## What I Would Improve

1. **Add `admin`-only user management endpoint** — currently role self-assignment is a critical security gap.
2. **Wrap queue number assignment in a transaction** — fix the concurrency race condition described above.
3. **Add pagination** to `GET /api/appointments` — in production a clinic could have thousands of records.
4. **Add date-aware queue reset** — queue numbers currently accumulate globally per date. A scheduled reset at midnight would keep numbers readable (1, 2, 3… each day).
5. **Expand Playwright to Firefox and WebKit** — trivial config change but improves cross-browser confidence.
6. **Add integration test for the full Register → Book → Serve flow** — the only place this is covered end-to-end is the Playwright suite; a Jest integration test would provide faster feedback.
7. **Seed script** — a `seed.js` script to populate demo data would make reviewer setup faster.
8. **Add `updated_at` trigger in SQLite** — currently `updated_at` is set manually in every UPDATE statement; a trigger would make it automatic and impossible to forget.
