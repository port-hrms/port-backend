
const express = require("express");
const router = express.Router();

const {
    logLocation,
    getLiveAgents,
    getAgentHistory,
    getAgentVisits,
    getTrackingStats,
    toggleFieldAgent,
    deleteTracking,
} = require("../controllers/admin/trackingController");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { uploadImage } = require("../middleware/uploadMiddleware");

router.post("/log", protect, uploadImage, logLocation);

// ─── HR Dashboard Endpoints ───────────────────────────────────

// GET /api/tracking/live       → live map — latest position of all agents
router.get("/live", protect, authorizeRoles("admin"), getLiveAgents);

// GET /api/tracking/stats      → today's summary stats
router.get("/stats", protect, authorizeRoles("admin"), getTrackingStats);

// GET /api/tracking/history/:agentId?date=2026-03-11
router.get("/history/:agentId", protect, getAgentHistory);

// GET /api/tracking/visits/:agentId  → get all client/student visits history
router.get("/visits/:agentId", protect, getAgentVisits);

// PUT /api/tracking/agents/:employeeId/toggle  → mark/unmark as field agent
router.put("/agents/:employeeId/toggle", protect, authorizeRoles("admin"), toggleFieldAgent);

// DELETE /api/tracking/:id     → delete a ping record (admin only)
router.delete("/:id", protect, authorizeRoles("admin"), deleteTracking);

module.exports = router;