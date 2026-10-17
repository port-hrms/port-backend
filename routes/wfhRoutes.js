// @ts-nocheck
const express = require("express");
const router = express.Router();
const wfhController = require("../controllers/employee/wfhController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// ─── Employee + Admin ──────────────────────────────────────────
router.get("/", protect, wfhController.getWFHRequests);
router.get("/stats", protect, wfhController.getWFHStats);

// ─── Employee only ─────────────────────────────────────────────
router.get("/today", protect, authorizeRoles("employee"), wfhController.getTodayWFH);
router.post("/", protect, authorizeRoles("employee"), wfhController.applyWFH);
router.delete("/:id", protect, authorizeRoles("employee"), wfhController.cancelWFH);

// ─── Admin only ────────────────────────────────────────────────
router.put("/:id", protect, authorizeRoles("admin"), wfhController.updateWFHStatus);

module.exports = router;
