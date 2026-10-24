
const express = require("express");
const router = express.Router();
const {
    getAttendance, getTodaySummary, markAttendance,
    markBulkAttendance, updateAttendance, deleteAttendance,
    getEmployeeMonthlyReport,
} = require("../controllers/admin/attendanceController");
const { checkIn, checkOut } = require("../controllers/employee/attendanceController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

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
