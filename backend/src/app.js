require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const appointmentRoutes = require("./routes/appointments");
const queueRoutes = require("./routes/queue");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "https://quecareclinic.vercel.app",
    credentials: true,
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/queue", queueRoutes);

// 404 handler
app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;
