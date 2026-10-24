
const express = require("express");
const router = express.Router();

const {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeeStats,
    getEmployeeSensitive,
    downloadEmployeeDocument,
    importEmployees,
    sendEmployeeInvite,
    getEmployeeOverview,
    updateEmployeeAvatar,
} = require("../controllers/admin/employeeController");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { validateCreateEmployeeInput } = require("../middleware/employeeValidationMiddleware");
const { uploadEmployeeDocs, uploadAvatar } = require("../middleware/uploadMiddleware");

// Stats route — admin + hr
router.get("/stats/summary", protect, authorizeRoles("admin"), getEmployeeStats);

// List + Create
router
    .route("/")
    .get(protect, authorizeRoles("admin", "employee"), getAllEmployees)
    .post(protect, authorizeRoles("admin"), uploadEmployeeDocs, validateCreateEmployeeInput, createEmployee);

// Bulk import (CSV parsed on the client, sent as JSON rows)
router.post("/import", protect, authorizeRoles("admin"), importEmployees);

// Email a password-setup link (creates the login if the employee has none)
router.post("/:id/send-invite", protect, authorizeRoles("admin"), sendEmployeeInvite);

// Profile page (all tabs) and profile photo — admin or the employee themself
router.get("/:id/overview", protect, authorizeRoles("admin", "employee"), getEmployeeOverview);
router.put("/:id/avatar", protect, authorizeRoles("admin", "employee"), uploadAvatar, updateEmployeeAvatar);
router.delete("/:id/avatar", protect, authorizeRoles("admin", "employee"), updateEmployeeAvatar);

// Full identity/bank numbers (masked everywhere else) — admin only
router.get("/:id/sensitive", protect, authorizeRoles("admin"), getEmployeeSensitive);

// Uploaded documents — served only through this authenticated route
router.get("/:id/documents/:docKey", protect, authorizeRoles("admin", "employee"), downloadEmployeeDocument);

// Single + Update + Delete
router
    .route("/:id")
    .get(protect, authorizeRoles("admin", "employee"), getEmployeeById)
    .put(protect, authorizeRoles("admin"), uploadEmployeeDocs, updateEmployee)
    .delete(protect, authorizeRoles("admin"), deleteEmployee); // admin only

module.exports = router;