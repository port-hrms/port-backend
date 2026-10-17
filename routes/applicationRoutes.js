
const express = require("express");
const router  = express.Router();

const {
  submitApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  downloadResume,
  deleteApplication,
} = require("../controllers/admin/applicationController");

const { protect, authorizeRoles }  = require("../middleware/authMiddleware");
const { uploadSingleResume }       = require("../middleware/uploadMiddleware"); // ← moved here

// ─── PUBLIC — submit application + upload PDF ──────────────────
router.post("/", uploadSingleResume, submitApplication);

// ─── PRIVATE — HR manages applications ────────────────────────
router.get("/", protect, authorizeRoles("admin", "hr"), getApplications);

// Specific routes BEFORE /:id
router.get("/:id/resume", protect, authorizeRoles("admin", "hr"), downloadResume);

router
  .route("/:id")
  .get(protect,    authorizeRoles("admin", "hr"), getApplicationById)
  .put(protect,    authorizeRoles("admin", "hr"), updateApplication)
  .delete(protect, authorizeRoles("admin"),       deleteApplication);

module.exports = router;