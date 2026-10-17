const Announcement = require("../models/Announcement");

// @desc    Get all announcements (sorted by pinned first, then newest)
// @route   GET /api/announcements
// @access  Private (All Employees/Admins)
exports.getAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find()
            .populate("author", "name role avatar")
            .populate("comments.user", "name role avatar")
            .sort({ isPinned: -1, createdAt: -1 });

        res.status(200).json({ success: true, announcements });
    } catch (error) {
        console.error("Error fetching announcements:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// @desc    Create a new announcement
// @route   POST /api/announcements
// @access  Private/Admin
exports.createAnnouncement = async (req, res) => {
    try {
        const { title, content } = req.body;
        // Parse isPinned from FormData string if needed
        const isPinned = req.body.isPinned === "true" || req.body.isPinned === true;

        // Only admin/hr can pin posts
        const canPin = ["admin", "hr"].includes(req.user.role);

        let imagePath = null;
        if (req.file) {
            imagePath = `/uploads/images/${req.file.filename}`;
        }

        const announcement = await Announcement.create({
            title,
            content,
            image: imagePath,
            isPinned: canPin && isPinned ? true : false,
            author: req.user._id, 
        });

        const populatedAnnouncement = await Announcement.findById(announcement._id).populate("author", "name role avatar");

        res.status(201).json({ success: true, announcement: populatedAnnouncement });
    } catch (error) {
        console.error("Error creating announcement:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// @desc    Update an announcement
// @route   PUT /api/announcements/:id
// @access  Private/Admin
exports.updateAnnouncement = async (req, res) => {
    try {
        const { title, content } = req.body;

        let announcement = await Announcement.findById(req.params.id);
        if (!announcement) {
            return res.status(404).json({ success: false, message: "Announcement not found" });
        }

        announcement.title = title || announcement.title;
        announcement.content = content || announcement.content;

        if (req.file) {
            announcement.image = `/uploads/images/${req.file.filename}`;
        }
        
        const canPin = ["admin", "hr"].includes(req.user.role);
        if (canPin && req.body.isPinned !== undefined) {
             announcement.isPinned = req.body.isPinned === "true" || req.body.isPinned === true;
        }

        await announcement.save();

        const populatedAnnouncement = await Announcement.findById(announcement._id).populate("author", "name role avatar");

        res.status(200).json({ success: true, announcement: populatedAnnouncement });
    } catch (error) {
        console.error("Error updating announcement:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// @desc    Delete an announcement
// @route   DELETE /api/announcements/:id
// @access  Private/Admin
exports.deleteAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);

        if (!announcement) {
            return res.status(404).json({ success: false, message: "Announcement not found" });
        }

        // Check if user is author or admin
        const isAuthor = announcement.author.toString() === req.user._id.toString();
        const isAdmin = ["admin", "hr"].includes(req.user.role);

        if (!isAuthor && !isAdmin) {
             return res.status(403).json({ success: false, message: "Not authorized to delete this" });
        }

        await Announcement.findByIdAndDelete(req.params.id);

        res.status(200).json({ success: true, message: "Announcement deleted" });
    } catch (error) {
        console.error("Error deleting announcement:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// @desc    Toggle like on an announcement
// @route   PUT /api/announcements/:id/like
// @access  Private (All Employees/Admins)
exports.toggleLike = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);

        if (!announcement) {
            return res.status(404).json({ success: false, message: "Announcement not found" });
        }

        // Check if user has already liked it
        const isLiked = announcement.likes.includes(req.user._id);

        if (isLiked) {
            // Unlike
            announcement.likes = announcement.likes.filter(
                (userId) => userId.toString() !== req.user._id.toString()
            );
        } else {
            // Like
            announcement.likes.push(req.user._id);
        }

        await announcement.save();

        res.status(200).json({ success: true, likes: announcement.likes });
    } catch (error) {
        console.error("Error liking announcement:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// @desc    Add comment to announcement
// @route   POST /api/announcements/:id/comments
// @access  Private
exports.addComment = async (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text) {
             return res.status(400).json({ success: false, message: "Comment text is required" });
        }

        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) {
            return res.status(404).json({ success: false, message: "Announcement not found" });
        }

        const newComment = {
            user: req.user._id,
            text
        };

        announcement.comments.push(newComment);
        await announcement.save();

        const populatedAnnouncement = await Announcement.findById(announcement._id)
             .populate("author", "name role avatar")
             .populate("comments.user", "name role avatar");

        res.status(201).json({ success: true, comments: populatedAnnouncement.comments });
    } catch (error) {
        console.error("Error adding comment:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// @desc    Delete comment from announcement
// @route   DELETE /api/announcements/:id/comments/:commentId
// @access  Private
exports.deleteComment = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) {
            return res.status(404).json({ success: false, message: "Announcement not found" });
        }

        const comment = announcement.comments.find(
             c => c._id.toString() === req.params.commentId
        );

        if (!comment) {
            return res.status(404).json({ success: false, message: "Comment not found" });
        }

        // Check author or admin
        const isAuthor = comment.user.toString() === req.user._id.toString();
        const isAdmin = ["admin", "hr"].includes(req.user.role);

        if (!isAuthor && !isAdmin) {
             return res.status(403).json({ success: false, message: "Not authorized to delete comment" });
        }

        announcement.comments = announcement.comments.filter(
             c => c._id.toString() !== req.params.commentId
        );

        await announcement.save();

        res.status(200).json({ success: true, comments: announcement.comments });
    } catch (error) {
        console.error("Error deleting comment:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};
