# QueueCare — Clinic Appointment System

A full-stack clinic appointment management system built as a QA engineering assessment.  
**Stack:** Node.js + Express + SQLite (backend) · React + Vite (frontend) · Jest + Supertest (API tests) · Playwright (UI tests)

---

## Prerequisites

| Tool | Minimum version | Check with |
|------|----------------|-----------|
| Node.js | **22.x** | `node -v` |
| npm | 9.x | `npm -v` |

> **Why Node.js 22?**  
> The backend uses Node.js 22's built-in `node:sqlite` module (`node:sqlite` was added in v22.5.0).  
> This is an experimental API in Node 22 (stable in Node 23+). The `--experimental-sqlite` flag  
> is passed automatically by all npm scripts — no extra setup needed.  
> No native compilation is required, so `npm install` works on all platforms out of the box.

---

## Project structure

```
QueueCare/
├── backend/          Node.js + Express REST API
│   ├── src/          Source code
│   ├── tests/        Jest + Supertest API tests
│   └── data/         SQLite database file (auto-created, git-ignored)
├── frontend/         React + Vite SPA
│   └── src/
├── tests/
│   └── ui/           Playwright browser tests
├── playwright.config.js
└── README.md
```

---

## Installation

### 1. Install backend dependencies

```bash
cd backend
npm install
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

### 3. Install Playwright and root dependencies

```bash
# From the project root (QueueCare/)
npm install
npx playwright install chromium
```

---

## Environment variables

The backend reads `.env` in the `backend/` folder.  
A working `.env` is already included for development. To customise it, copy `.env.example`:

```bash
cd backend
copy .env.example .env   # Windows
# or
cp .env.example .env     # Mac/Linux
```

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | API server port |
| `JWT_SECRET` | *(set in .env)* | Secret for signing JWT tokens |
| `NODE_ENV` | `development` | Set to `test` automatically during `npm test` |
| `FRONTEND_URL` | `http://localhost:3000` | Allowed CORS origin |

---

## Running the application

Open **two terminals** from the project root:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```
API is now available at `http://localhost:5000/api`

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
App is now available at `http://localhost:3000`

---

## Default test credentials

You can register accounts with any credentials via the UI at `/register`.

For quick testing, here are suggested accounts (register them first via the UI or API):

| Role | Email | Password |
|------|-------|----------|
| Patient | patient@demo.com | demo1234 |
| Staff | staff@demo.com | demo1234 |
| Admin | admin@demo.com | demo1234 |

---

## Running API tests

API tests use an **in-memory SQLite database** — no running server needed.

```bash
cd backend
npm test
```

Expected output:
```
PASS tests/api/auth.test.js
PASS tests/api/appointments.test.js
PASS tests/api/queue.test.js

Test Suites: 3 passed
Tests:       ~40 passed
```

---

## Running UI tests

UI tests require both the backend and frontend to be running.  
The Playwright config (`playwright.config.js`) starts both servers automatically.

```bash
# From project root
npm run test:ui

# To see the browser (headed mode):
npx playwright test --headed

# To view the HTML report after a run:
npx playwright show-report
```

> **Note:** If you already have the servers running, set `reuseExistingServer: true` in  
> `playwright.config.js` (it is already set to `true`).

---

## Running all tests

```bash
# From project root
npm run test:all
```

---

## API reference (quick)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Register a new user |
| POST | `/api/auth/login` | — | Login and receive JWT |
| GET | `/api/appointments` | Bearer | List appointments (role-filtered) |
| POST | `/api/appointments` | Bearer | Create appointment |
| GET | `/api/appointments/:id` | Bearer | Get single appointment |
| PUT | `/api/appointments/:id` | Bearer | Update appointment |
| DELETE | `/api/appointments/:id` | Bearer | Cancel appointment |
| GET | `/api/queue/today` | Bearer | Today's queue ordered by queue number |
| PATCH | `/api/queue/:id/serve` | Bearer (staff/admin) | Mark patient as served |
