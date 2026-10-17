// server/services/incomeService.js
// @ts-nocheck

const Income = require("../../models/Income");

const buildDateFilter = (startDate, endDate) => {
    if (!startDate && !endDate) return null;
    const filter = {};
    if (startDate) filter.$gte = new Date(startDate);
    if (endDate)   filter.$lte = new Date(endDate);
    return filter;
};

const getIncome = async ({ source, startDate, endDate } = {}) => {
    const filter = {};
    if (source && source !== "All") filter.source = source;
    const dateFilter = buildDateFilter(startDate, endDate);
    if (dateFilter) filter.date = dateFilter;
    return Income.find(filter).sort({ date: -1 });
};

const createIncome = async (data, userId) => {
    return Income.create({ ...data, createdBy: userId });
};

const updateIncome = async (id, data) => {
    const income = await Income.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!income) throw Object.assign(new Error("Income record not found"), { statusCode: 404 });
    return income;
};

const deleteIncome = async (id) => {
    const income = await Income.findByIdAndDelete(id);
    if (!income) throw Object.assign(new Error("Income record not found"), { statusCode: 404 });
    return income;
};

const getIncomeTotals = async (dateFilter) => {
    return Income.aggregate([
        { $match: { date: dateFilter } },
        { $group: { _id: "$source", total: { $sum: "$amount" } } },
    ]);
};

module.exports = { getIncome, createIncome, updateIncome, deleteIncome, getIncomeTotals };
