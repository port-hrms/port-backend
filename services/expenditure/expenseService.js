// server/services/expenseService.js
// @ts-nocheck

const Expense = require("../../models/Expense");

const buildDateFilter = (startDate, endDate) => {
    if (!startDate && !endDate) return null;
    const filter = {};
    if (startDate) filter.$gte = new Date(startDate);
    if (endDate)   filter.$lte = new Date(endDate);
    return filter;
};

const getExpenses = async ({ category, startDate, endDate } = {}) => {
    const filter = {};
    if (category && category !== "All") filter.category = category;
    const dateFilter = buildDateFilter(startDate, endDate);
    if (dateFilter) filter.date = dateFilter;
    return Expense.find(filter).sort({ date: -1 });
};

const createExpense = async (data, userId) => {
    return Expense.create({ ...data, createdBy: userId });
};

const updateExpense = async (id, data) => {
    const expense = await Expense.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!expense) throw Object.assign(new Error("Expense not found"), { statusCode: 404 });
    return expense;
};

const deleteExpense = async (id) => {
    const expense = await Expense.findByIdAndDelete(id);
    if (!expense) throw Object.assign(new Error("Expense not found"), { statusCode: 404 });
    return expense;
};

const getExpenseTotals = async (dateFilter) => {
    return Expense.aggregate([
        { $match: { date: dateFilter } },
        { $group: { _id: "$category", total: { $sum: "$amount" } } },
    ]);
};

module.exports = { getExpenses, createExpense, updateExpense, deleteExpense, getExpenseTotals };
