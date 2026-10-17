// @ts-nocheck
const express = require("express");
const leaveController = require("../controllers/employee/leaveController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
	validateCreateLeaveInput,
	validateEmployeeIdQuery,
	validateUpdateLeaveStatusInput,
} = require("../middleware/leaveValidationMiddleware");

const router = express.Router();

// ─── GET Routes ───────────────────────────────────────────────
router.get("/", protect, leaveController.getLeaves);
router.get("/stats", protect, validateEmployeeIdQuery, leaveController.getLeaveStats);
router.get("/recent", protect, validateEmployeeIdQuery, leaveController.getRecentLeaves);

// ─── POST Routes ───────────────────────────────────────────────
router.post("/", protect, validateCreateLeaveInput, leaveController.createLeave);

// ─── PUT Routes ───────────────────────────────────────────────
router.put(
	"/:leaveId",
	protect,
	authorizeRoles("admin"),
	validateUpdateLeaveStatusInput,
	leaveController.updateLeave
);

// ─── DELETE Routes ───────────────────────────────────────────
router.delete("/:leaveId", protect, leaveController.deleteLeave);

module.exports = router;
