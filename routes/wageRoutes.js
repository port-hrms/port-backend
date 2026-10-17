// server/routes/wageRoutes.js
const express = require("express");
const router = express.Router();
const { createWage, getWages, markWageAsPaid, deleteWage, createWageRazorpayOrder, verifyWageRazorpayPayment } = require("../controllers/admin/wageController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// GET  /api/wages       — fetch all wage records (admin only)
router.get("/", protect, authorizeRoles("admin"), getWages);

// POST /api/wages       — create a new wage record (admin only)
router.post("/", protect, authorizeRoles("admin"), createWage);

// PUT  /api/wages/:id/mark-paid — mark as paid (admin only)
router.put("/:id/mark-paid", protect, authorizeRoles("admin"), markWageAsPaid);

// POST /api/wages/:id/razorpay-order — create Razorpay order for wage
router.post("/:id/razorpay-order", protect, authorizeRoles("admin"), createWageRazorpayOrder);

// POST /api/wages/:id/verify-payment — verify Razorpay payment and mark wage as paid
router.post("/:id/verify-payment", protect, authorizeRoles("admin"), verifyWageRazorpayPayment);

// DELETE /api/wages/:id — delete a wage record (admin only)
router.delete("/:id", protect, authorizeRoles("admin"), deleteWage);

module.exports = router;
