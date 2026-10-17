
const express = require("express");
const router = express.Router();
const {
    getReviews, getReviewById, createReview,
    updateReview, deleteReview, getPerformanceStats,
} = require("../controllers/admin/performanceController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { validateCreateReviewInput } = require("../middleware/performanceValidationMiddleware");

router.get("/stats/summary", protect, authorizeRoles("admin"), getPerformanceStats);
router.route("/")
    .get(protect, authorizeRoles("admin", "employee"), getReviews)
    .post(protect, authorizeRoles("admin"), validateCreateReviewInput, createReview);
router.route("/:id")
    .get(protect, authorizeRoles("admin", "employee"), getReviewById)
    .put(protect, authorizeRoles("admin"), updateReview)
    .delete(protect, authorizeRoles("admin"), deleteReview);

module.exports = router;