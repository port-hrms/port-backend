// @ts-nocheck
// server/controllers/admin/expenditureController.js
// Thin controller — all DB logic lives in the service layer.

const expenseService = require("../../services/expenditure/expenseService");
const incomeService = require("../../services/expenditure/incomeService");
const advanceService = require("../../services/expenditure/advanceService");
const statsService = require("../../services/expenditure/expenditureStatsService");

const resolveStatus = (e, fallback = 500) => e?.statusCode || fallback;

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const fail = (res, e, msg, fallback = 500) => res.status(resolveStatus(e, fallback)).json({ success: false, message: msg, error: e.message });

// ─────────────────────────────────────────────────────────────
// EXPENSES
// ─────────────────────────────────────────────────────────────

const getExpenses = async (req, res) => {
    try {
        const expenses = await expenseService.getExpenses(req.query);
        res.json({ success: true, count: expenses.length, data: expenses });
    } catch (e) { fail(res, e, "Error fetching expenses"); }
};

const createExpense = async (req, res) => {
    try { ok(res, await expenseService.createExpense(req.body, req.user._id), 201); }
    catch (e) { fail(res, e, "Error creating expense", 400); }
};

const updateExpense = async (req, res) => {
    try { ok(res, await expenseService.updateExpense(req.params.id, req.body)); }
    catch (e) { fail(res, e, "Error updating expense", 400); }
};

const deleteExpense = async (req, res) => {
    try {
        await expenseService.deleteExpense(req.params.id);
        res.json({ success: true, message: "Expense deleted" });
    } catch (e) { fail(res, e, "Error deleting expense"); }
};

// ─────────────────────────────────────────────────────────────
// INCOME
// ─────────────────────────────────────────────────────────────

const getIncome = async (req, res) => {
    try {
        const income = await incomeService.getIncome(req.query);
        res.json({ success: true, count: income.length, data: income });
    } catch (e) { fail(res, e, "Error fetching income"); }
};

const createIncome = async (req, res) => {
    try { ok(res, await incomeService.createIncome(req.body, req.user._id), 201); }
    catch (e) { fail(res, e, "Error creating income record", 400); }
};

const updateIncome = async (req, res) => {
    try { ok(res, await incomeService.updateIncome(req.params.id, req.body)); }
    catch (e) { fail(res, e, "Error updating income record", 400); }
};

const deleteIncome = async (req, res) => {
    try {
        await incomeService.deleteIncome(req.params.id);
        res.json({ success: true, message: "Income record deleted" });
    } catch (e) { fail(res, e, "Error deleting income record"); }
};

// ─────────────────────────────────────────────────────────────
// ADVANCES
// ─────────────────────────────────────────────────────────────

const getAdvances = async (req, res) => {
    try {
        const advances = await advanceService.getAdvances(req.query);
        res.json({ success: true, count: advances.length, data: advances });
    } catch (e) { fail(res, e, "Error fetching advances"); }
};

const createAdvance = async (req, res) => {
    try { ok(res, await advanceService.createAdvance(req.body, req.user._id), 201); }
    catch (e) { fail(res, e, "Error creating advance", 400); }
};

const updateAdvance = async (req, res) => {
    try { ok(res, await advanceService.updateAdvance(req.params.id, req.body)); }
    catch (e) { fail(res, e, "Error updating advance", 400); }
};

const deleteAdvance = async (req, res) => {
    try {
        await advanceService.deleteAdvance(req.params.id);
        res.json({ success: true, message: "Advance record deleted" });
    } catch (e) { fail(res, e, "Error deleting advance"); }
};

const clearAdvance = async (req, res) => {
    try { ok(res, await advanceService.clearAdvance(req.params.id)); }
    catch (e) { fail(res, e, "Error clearing advance"); }
};

// ─────────────────────────────────────────────────────────────
// STATS & REPORTS
// ─────────────────────────────────────────────────────────────

const getExpenditureStats = async (req, res) => {
    try {
        const month = Number(req.query.month) || new Date().getMonth() + 1;
        const year = Number(req.query.year) || new Date().getFullYear();
        ok(res, await statsService.getStats(month, year));
    } catch (e) { fail(res, e, "Error fetching expenditure stats"); }
};

const getExpenditureReport = async (req, res) => {
    try {
        const month = Number(req.query.month) || new Date().getMonth() + 1;
        const year = Number(req.query.year) || new Date().getFullYear();
        ok(res, await statsService.getReport(month, year));
    } catch (e) { fail(res, e, "Error generating expenditure report"); }
};

module.exports = {
    getExpenses, createExpense, updateExpense, deleteExpense,
    getIncome, createIncome, updateIncome, deleteIncome,
    getAdvances, createAdvance, updateAdvance, deleteAdvance, clearAdvance,
    getExpenditureStats, getExpenditureReport,
};
