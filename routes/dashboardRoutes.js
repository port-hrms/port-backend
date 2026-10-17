
const express = require("express");
const router = express.Router();
const { getStats, getEmployeeStats } = require("../controllers/dashboardController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// All logged-in users can see the dashboard
router.get("/stats", protect, getStats);
router.get("/employee", protect, authorizeRoles("employee"), getEmployeeStats);

module.exports = router;
