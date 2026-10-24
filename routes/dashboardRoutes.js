
const express = require("express");
const router = express.Router();
const { getStats, getEmployeeStats, getEmployeeHighlights } = require("../controllers/dashboardController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// Company-wide figures (payroll cost, revenue, everyone's leaves…) — admins (incl. HR staff) only
router.get("/stats", protect, authorizeRoles("admin"), getStats);

// Employee dashboard: own stats, plus today's birthdays
router.get("/employee", protect, authorizeRoles("employee"), getEmployeeStats);
router.get("/employee/highlights", protect, authorizeRoles("employee"), getEmployeeHighlights);

module.exports = router;
