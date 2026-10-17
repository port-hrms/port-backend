
const express = require("express");
const router = express.Router();

const {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeeStats,
} = require("../controllers/admin/employeeController");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const { validateCreateEmployeeInput } = require("../middleware/employeeValidationMiddleware");
const { uploadEmployeeDocs } = require("../middleware/uploadMiddleware");

// Stats route — admin + hr
router.get("/stats/summary", protect, authorizeRoles("admin"), getEmployeeStats);

// List + Create
router
    .route("/")
    .get(protect, authorizeRoles("admin", "employee"), getAllEmployees)
    .post(protect, authorizeRoles("admin"), uploadEmployeeDocs, validateCreateEmployeeInput, createEmployee);

// Single + Update + Delete
router
    .route("/:id")
    .get(protect, authorizeRoles("admin", "employee"), getEmployeeById)
    .put(protect, authorizeRoles("admin"), uploadEmployeeDocs, updateEmployee)
    .delete(protect, authorizeRoles("admin"), deleteEmployee); // admin only

module.exports = router;