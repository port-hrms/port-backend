const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { uploadImage } = require("../middleware/uploadMiddleware");
const {
    getAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    toggleLike,
    addComment,
    deleteComment,
} = require("../controllers/announcementController");

// General access (Admins + Employees)
router.get("/", protect, getAnnouncements);
router.put("/:id/like", protect, toggleLike);

router.post("/", protect, uploadImage, createAnnouncement);
router.put("/:id", protect, uploadImage, updateAnnouncement);
router.delete("/:id", protect, deleteAnnouncement);

// Comments
router.post("/:id/comments", protect, addComment);
router.delete("/:id/comments/:commentId", protect, deleteComment);

module.exports = router;
