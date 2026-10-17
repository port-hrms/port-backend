// server/routes/expenditureRoutes.js
const express = require("express");
const router  = express.Router();
const {
    getExpenses, createExpense, updateExpense, deleteExpense,
    getIncome,   createIncome,  updateIncome,  deleteIncome,
    getAdvances, createAdvance, updateAdvance, deleteAdvance, clearAdvance,
    getExpenditureStats, getExpenditureReport,
} = require("../controllers/admin/expenditureController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const admin = [protect, authorizeRoles("admin")];

// ─── Overview / Stats ─────────────────────────────────────────
router.get("/stats",  ...admin, getExpenditureStats);
router.get("/report", ...admin, getExpenditureReport);

// ─── Expenses ─────────────────────────────────────────────────
router.route("/expenses")
    .get(...admin, getExpenses)
    .post(...admin, createExpense);

router.route("/expenses/:id")
    .put(...admin, updateExpense)
    .delete(...admin, deleteExpense);

// ─── Income ───────────────────────────────────────────────────
router.route("/income")
    .get(...admin, getIncome)
    .post(...admin, createIncome);

router.route("/income/:id")
    .put(...admin, updateIncome)
    .delete(...admin, deleteIncome);

// ─── Advances ─────────────────────────────────────────────────
router.route("/advances")
    .get(...admin, getAdvances)
    .post(...admin, createAdvance);

router.route("/advances/:id")
    .put(...admin, updateAdvance)
    .delete(...admin, deleteAdvance);

router.patch("/advances/:id/clear", ...admin, clearAdvance);

module.exports = router;
