// server/services/advanceService.js
// @ts-nocheck

const Advance = require("../../models/Advance");

const EMPLOYEE_FIELDS = "firstName lastName employeeId";

const getAdvances = async ({ status } = {}) => {
    const filter = {};
    if (status && status !== "All") filter.status = status;
    return Advance.find(filter)
        .populate("employee", EMPLOYEE_FIELDS)
        .sort({ date: -1 });
};

const createAdvance = async (data, userId) => {
    const advance = await Advance.create({ ...data, createdBy: userId });
    return advance.populate("employee", EMPLOYEE_FIELDS);
};

const updateAdvance = async (id, data) => {
    const advance = await Advance.findByIdAndUpdate(id, data, { new: true, runValidators: true })
        .populate("employee", EMPLOYEE_FIELDS);
    if (!advance) throw Object.assign(new Error("Advance record not found"), { statusCode: 404 });
    return advance;
};

const deleteAdvance = async (id) => {
    const advance = await Advance.findByIdAndDelete(id);
    if (!advance) throw Object.assign(new Error("Advance record not found"), { statusCode: 404 });
    return advance;
};

const clearAdvance = async (id) => {
    const advance = await Advance.findById(id);
    if (!advance) throw Object.assign(new Error("Advance record not found"), { statusCode: 404 });
    advance.status = "Cleared";
    advance.paid   = advance.amount;
    await advance.save();
    return advance;
};

const getActiveAdvanceOutstanding = async () => {
    const advances = await Advance.find({ status: "Active" });
    return advances.reduce((sum, a) => sum + Math.max(0, a.amount - a.paid), 0);
};

module.exports = {
    getAdvances, createAdvance, updateAdvance,
    deleteAdvance, clearAdvance, getActiveAdvanceOutstanding,
};
