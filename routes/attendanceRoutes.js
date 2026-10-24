
const express = require("express");
const router = express.Router();
const {
    getAttendance, getTodaySummary, markAttendance,
    markBulkAttendance, updateAttendance, deleteAttendance,
    getEmployeeMonthlyReport, getPolicy,
    getDeletedAttendance, restoreAttendance, getAttendanceHistory,
} = require("../controllers/admin/attendanceController");
const { checkIn, checkOut } = require("../controllers/employee/attendanceController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// Shift rules (start/end, grace, half-day, weekly off) — any signed-in user
router.get("/policy", protect, getPolicy);
// Deleted records for ?date=YYYY-MM-DD, restore, and change history (admin)
router.get("/deleted", protect, authorizeRoles("admin"), getDeletedAttendance);
router.put("/:id/restore", protect, authorizeRoles("admin"), restoreAttendance);
router.get("/:id/history", protect, authorizeRoles("admin"), getAttendanceHistory);

// Summary for ?date=YYYY-MM-DD (defaults to today, IST)
router.get("/today/summary", protect, authorizeRoles("admin"), getTodaySummary);
router.get("/report/:employeeId", protect, authorizeRoles("admin", "employee"), getEmployeeMonthlyReport);
router.post("/check-in", protect, authorizeRoles("employee"), checkIn);
router.post("/check-out", protect, authorizeRoles("employee"), checkOut);
router.post("/bulk", protect, authorizeRoles("admin"), markBulkAttendance);
router.route("/")
    .get(protect, authorizeRoles("admin"), getAttendance)
    .post(protect, authorizeRoles("admin"), markAttendance);
router.route("/:id")
    .put(protect, authorizeRoles("admin"), updateAttendance)
    .delete(protect, authorizeRoles("admin"), deleteAttendance);

module.exports = router;
