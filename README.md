# QueueCare — Clinic Appointment System

This is a full-stack clinic appointment management system built as a QA engineering assessment for Amali Tech.  
**Stack I used:** Node.js + Express + SQLite (backend) · React + Vite (frontend) · Jest + Supertest (API tests) · Playwright (UI tests)

---

## Prerequisites

| Tool    | Minimum version used | How to check |
| ------- | -------------------- | ------------ |
| Node.js | **22.x**             | `node -v`    |
| npm     | 9.x                  | `npm -v`     |

> **Why I chose to use Node.js 22?**  
> For the backend, I used Node.js 22's built-in `node:sqlite` module (`node:sqlite` is a package which was added in v22.5.0).  
> This is an experimental API in Node 22 (stable in Node 23+). The `--experimental-sqlite` flag  
> is passed automatically by all npm scripts — so there is no extra setup needed.  
> No native compilation is required, so `npm install` works on all platforms out of the box.

---

## Project structure

QueueCare/
├── backend/ Node.js + Express REST API
│ ├── src/ Source code
│ ├── tests/ Jest + Supertest API tests
│ └── data/ SQLite database file (auto-created, git-ignored)
├── frontend/ React + Vite SPA
│ └── src/
├── tests/
│ └── ui/ Playwright browser tests
├── playwright.config.js
└── README.md

---

## Installation

### 1. Installing backend dependencies

cd backend
npm install

### 2. Installing frontend dependencies

cd frontend
npm install

### 3. Installing Playwright and root dependencies

# From the project root (QueueCare/)

npm install
npx playwright install chromium

---

## Environment variables

| Variable       | Default                    | Description                                         |
| -------------- | -------------------------- | --------------------------------------------------- |
| `PORT`         | `5000`                     | API server port                                     |
| `JWT_SECRET`   | osuald-kai-iradukunda-2026 | Secret for signing JWT tokens                       |
| `NODE_ENV`     | `development`              | It is set to `test` automatically during `npm test` |
| `FRONTEND_URL` | `http://localhost:3000`    | Allowed CORS origin                                 |

---

## Running the application

**Backend:**

cd backend
npm run dev

API is available at `http://localhost:5000/api`

API is also deployed at `https://queuecare-fr0r.onrender.com`

**Frontend:**

cd frontend
npm run dev

App is available at `http://localhost:3000`

App is also deployed at `https://quecareclinic.vercel.app`

---

## Default test credentials

To test this you can register accounts with any credentials using the form at `/register`.

Here are starting accounts to start with (by register them first using the UI):

| Role    | Email            | Password |
| ------- | ---------------- | -------- |
| Patient | patient@demo.com | demo1234 |
| Staff   | staff@demo.com   | demo1234 |
| Admin   | admin@demo.com   | demo1234 |

---

## Running API tests

API tests use an **in-memory SQLite database** — so that no running server needed.

cd backend
npm test

Expected output:

PASS tests/api/auth.test.js
PASS tests/api/appointments.test.js
PASS tests/api/queue.test.js

Test Suites: 3 passed
Tests: ~40 passed

---

## Running UI tests

To run UI tests we need to run both backend and frontend.  
We can use Playwright config (`playwright.config.js`) which starts both servers automatically.

# From project root

npm run test:ui

# To see the browser (using headed mode):

npx playwright test --headed

# To view the HTML report after a run we can use:

npx playwright show-report

---

## Running all tests

# From project root

npm run test:all

---

## All APIs for reference (quick)

| Method | Endpoint                | Auth                 | Description                           |
| ------ | ----------------------- | -------------------- | ------------------------------------- |
| POST   | `/api/auth/register`    | —                    | Register a new user                   |
| POST   | `/api/auth/login`       | —                    | Login and receive JWT                 |
| GET    | `/api/appointments`     | Bearer               | List appointments (role-filtered)     |
| POST   | `/api/appointments`     | Bearer               | Create appointment                    |
| GET    | `/api/appointments/:id` | Bearer               | Get single appointment                |
| PUT    | `/api/appointments/:id` | Bearer               | Update appointment                    |
| DELETE | `/api/appointments/:id` | Bearer               | Cancel appointment                    |
| GET    | `/api/queue/today`      | Bearer               | Today's queue ordered by queue number |
| PATCH  | `/api/queue/:id/serve`  | Bearer (staff/admin) | Mark patient as served                |
