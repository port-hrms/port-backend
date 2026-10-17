// @ts-nocheck

const {
    registerUser,
    loginUser,
    getCurrentUserProfile,
    updateCurrentUserProfile,
    changeCurrentUserPassword,
    getUsers,
    toggleStatus,
    forgotPassword,
    resetPassword,
} = require("../services/auth/authService");
const { sendTokenResponse } = require("../utils/authToken");
const { sendPasswordResetEmail } = require("../services/emailService");

const resolveStatusCode = (error, fallback = 500) => error?.statusCode || fallback;


const register = async (req, res) => {
    try {
        const user = await registerUser(req.body);
        return sendTokenResponse(user, 201, res, "Account created successfully! 🎉");
    } catch (error) {
        return res.status(resolveStatusCode(error, 400)).json({
            success: false,
            message: error.message || "Registration failed",
            error: error.message,
        });
    }
};

const login = async (req, res) => {
    try {
        const user = await loginUser(req.body);
        return sendTokenResponse(user, 200, res, `Welcome back, ${user.name}! 👋`);
    } catch (error) {
        return res.status(resolveStatusCode(error, 500)).json({
            success: false,
            message: error.message || "Login failed",
            error: error.message,
        });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await getCurrentUserProfile(req.user._id);
        return res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching profile",
            error: error.message,
        });
    }
};

const updateProfile = async (req, res) => {
    try {
        const user = await updateCurrentUserProfile(req.user._id, req.body);
        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: user,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Error updating profile",
            error: error.message,
        });
    }
};

const changePassword = async (req, res) => {
    try {
        await changeCurrentUserPassword(req.user._id, req.body.currentPassword, req.body.newPassword);
        return res.status(200).json({
            success: true,
            message: "Password changed successfully! Please log in again.",
        });
    } catch (error) {
        return res.status(resolveStatusCode(error, 400)).json({
            success: false,
            message: "Error changing password",
            error: error.message,
        });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const users = await getUsers();
        return res.status(200).json({
            success: true,
            count: users.length,
            data: users,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching users",
            error: error.message,
        });
    }
};

const toggleUserStatus = async (req, res) => {
    try {
        const user = await toggleStatus(req.params.id);
        return res.status(200).json({
            success: true,
            message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
            data: user,
        });
    } catch (error) {
        return res.status(resolveStatusCode(error, 500)).json({
            success: false,
            message: "Error toggling user status",
            error: error.message,
        });
    }
};

const handleForgotPassword = async (req, res) => {
    try {
        const result = await forgotPassword(req.body.email);

        if (result) {
            const clientUrl = process.env.CLIENT_URL || "http://localhost:5174";
            const resetUrl = `${clientUrl}/reset-password/${result.rawToken}`;
            await sendPasswordResetEmail({ to: result.email, name: result.name, resetUrl });
        }

        // Always return 200 to prevent email enumeration
        return res.status(200).json({
            success: true,
            message: "If an account with that email exists, a password reset link has been sent.",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to process password reset request. Please try again.",
            error: error.message,
        });
    }
};

const handleResetPassword = async (req, res) => {
    try {
        await resetPassword(req.params.token, req.body.newPassword);
        return res.status(200).json({
            success: true,
            message: "Password reset successful! You can now log in with your new password.",
        });
    } catch (error) {
        return res.status(resolveStatusCode(error, 400)).json({
            success: false,
            message: error.message || "Password reset failed",
            error: error.message,
        });
    }
};

module.exports = {
    register,
    login,
    getMe,
    updateProfile,
    changePassword,
    getAllUsers,
    toggleUserStatus,
    handleForgotPassword,
    handleResetPassword,
};