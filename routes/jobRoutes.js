
const express = require("express");
const router = express.Router();

const {
    getPublicJobs,
    getPublicJobById,
    getAllJobs,
    createJob,
    updateJob,
    deleteJob,
    getRecruitmentStats,
} = require("../controllers/admin/jobController");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { validateCreateJobInput } = require("../middleware/jobValidationMiddleware");

// ─── PUBLIC routes (no token needed) ──────────────────────────
router.get("/public", getPublicJobs);       // browse all active jobs
router.get("/public/:id", getPublicJobById);    // view single job

// ─── PRIVATE routes (HR / Admin only) ─────────────────────────
router.get("/stats", protect, authorizeRoles("admin"), getRecruitmentStats);

router.route("/")
    .get(protect, authorizeRoles("admin"), getAllJobs)
    .post(protect, authorizeRoles("admin"), validateCreateJobInput, createJob);

router.route("/:id")
    .put(protect, authorizeRoles("admin"), updateJob)
    .delete(protect, authorizeRoles("admin"), deleteJob);

module.exports = router;