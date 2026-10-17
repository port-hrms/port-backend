const express = require("express");
const router = express.Router();
const { protectSuperAdmin } = require("../middleware/superAdminMiddleware");
const {
    login,
    getAnalytics,
    getOrganizations,
    createOrganization,
    toggleSuspend,
    getPlans,
    createPlan,
    updatePlan,
    deletePlan,
    getPayments,
} = require("../controllers/superadminController");

// Public
router.post("/login", login);

// Protected — require SuperAdmin JWT
router.get("/analytics", protectSuperAdmin, getAnalytics);

router.get("/organizations", protectSuperAdmin, getOrganizations);
router.post("/organizations", protectSuperAdmin, createOrganization);
router.patch("/organizations/:id/suspend", protectSuperAdmin, toggleSuspend);

router.get("/plans", protectSuperAdmin, getPlans);
router.post("/plans", protectSuperAdmin, createPlan);
router.put("/plans/:id", protectSuperAdmin, updatePlan);
router.delete("/plans/:id", protectSuperAdmin, deletePlan);

router.get("/payments", protectSuperAdmin, getPayments);

module.exports = router;
