
const express = require("express");
const router = express.Router();

const {
    register,
    login,
    getMe,
    updateProfile,
    changePassword,
    getAllUsers,
    toggleUserStatus,
    handleForgotPassword,
    handleResetPassword,
} = require("../controllers/authController");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
    validateRegisterInput,
    validateLoginInput,
    validateChangePasswordInput,
} = require("../middleware/authValidationMiddleware");

// ─── Public Routes (no token needed) ──────────────────────────

// POST /api/auth/register  → register new user
router.post("/register", validateRegisterInput, register);

// POST /api/auth/forgot-password  → send reset email
router.post("/forgot-password", handleForgotPassword);

// POST /api/auth/reset-password/:token  → set new password
router.post("/reset-password/:token", handleResetPassword);




// POST /api/auth/login     → login and get token

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user and get JWT token
 *     tags: [Auth]
 *     security: [] 
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@hr.com
 *               password:
 *                 type: string
 *                 example: admin123
 *               role:
 *                 type: string
 *                 enum: [admin, user]
 *                 example: admin
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", validateLoginInput, login);

// ─── Private Routes (token required) ──────────────────────────

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current logged-in user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully fetched user profile
 *       401:
 *         description: Unauthorized
 */
router.get("/me", protect, getMe);

// PUT /api/auth/update-profile  → update name/email
router.put("/update-profile", protect, updateProfile);

// PUT /api/auth/change-password → change password
router.put("/change-password", protect, validateChangePasswordInput, changePassword);

// ─── Admin Only Routes ────────────────────────────────────────

// GET /api/auth/users           → get all users (admin only)
router.get("/users", protect, authorizeRoles("admin"), getAllUsers);

// PUT /api/auth/users/:id/toggle-status → activate/deactivate user
router.put("/users/:id/toggle-status", protect, authorizeRoles("admin"), toggleUserStatus);

module.exports = router;