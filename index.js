const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const loggingMiddleware = require('./middleware/loggingMiddleware');

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

// Load environment variables
dotenv.config();

const app = express();

// Middleware
// Allowed frontends: local dev + deployed site(s). Extra origins can be added via
// CORS_ORIGINS (comma-separated) or CLIENT_URL in the environment, without code changes.
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "https://port-hrms.netlify.app",
  process.env.CLIENT_URL,
  ...(process.env.CORS_ORIGINS || "").split(","),
]
  .map((o) => (o || "").trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server) which send no Origin
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
}));
app.use(loggingMiddleware);

const path = require("path");

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve static files from uploads directory.
// Private folders (employee KYC documents, applicant resumes) are never served directly —
// they are only available through authenticated API routes.
app.use(["/uploads/employee-docs", "/uploads/resumes"], (req, res) => {
  res.status(404).json({ success: false, message: "Not found" });
});
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Test route
app.get("/", (req, res) => {
  res.json({ message: "✅ HR API is running!" });
});

// API Routes
app.use("/api/employees", require("./routes/employeeRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/payroll", require("./routes/payrollRoutes"));
app.use("/api/performance", require("./routes/performanceRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/tracking", require("./routes/trackingRoutes"));
app.use("/api/jobs", require("./routes/jobRoutes"));
app.use("/api/applications", require("./routes/applicationRoutes"));
app.use("/api/leaves", require("./routes/leaveRoutes"));
app.use("/api/wfh", require("./routes/wfhRoutes"));

app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/tasks", require("./routes/taskRoutes"));
app.use("/api/holidays", require("./routes/holidayRoutes"));

app.use("/api/announcements", require("./routes/announcementRoutes"));
app.use("/api/wages", require("./routes/wageRoutes"));
app.use("/api/workers", require("./routes/workerRoutes"));
app.use("/api/expenditure", require("./routes/expenditureRoutes"));

// Client & Billing Routes
app.use("/api/clients", require("./routes/clientRoutes"));
app.use("/api/quotations", require("./routes/quotationRoutes"));
app.use("/api/invoices", require("./routes/invoiceRoutes"));
app.use("/api/settings/company", require("./routes/companyRoutes"));

// SuperAdmin Routes
app.use("/api/superadmin", require("./routes/superadminRoutes"));

// ─── Start Server ──────────────────────────────────────────────
const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {

  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📄 Swagger docs at http://localhost:${PORT}/api-docs`);

  connectDB().then(async () => {
    const seedSuperAdmin = require("./seed/superadminSeed");
    await seedSuperAdmin();
  });
});
