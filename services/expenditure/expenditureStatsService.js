// server/services/expenditureStatsService.js
// @ts-nocheck

const Payroll = require("../../models/Payroll");
const Expense = require("../../models/Expense");
const Income = require("../../models/Income");
const Advance = require("../../models/Advance");
const { getExpenseTotals } = require("./expenseService");
const { getIncomeTotals } = require("./incomeService");

const monthRange = (month, year) => ({
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0, 23, 59, 59),
});

const buildBarChartData = async (month, year) => {
    const points = await Promise.all(
        Array.from({ length: 6 }, (_, i) => {
            const d = new Date(year, month - 1 - i, 1);
            const m = d.getMonth() + 1;
            const y = d.getFullYear();
            const { start, end } = monthRange(m, y);
            const dateFilter = { $gte: start, $lte: end };
            return Promise.all([
                Income.aggregate([{ $match: { date: dateFilter } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
                Expense.aggregate([{ $match: { date: dateFilter } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
            ]).then(([inc, exp]) => ({
                month: d.toLocaleString("en-IN", { month: "short" }),
                year: y,
                income: inc[0]?.total || 0,
                expenses: exp[0]?.total || 0,
            }));
        })
    );
    return points.reverse();
};

const getStats = async (month, year) => {
    const { start, end } = monthRange(month, year);
    const dateFilter = { $gte: start, $lte: end };

    const [expensesAgg, incomeAgg, activeAdvances, payrolls, barChartData] = await Promise.all([
        getExpenseTotals(dateFilter),
        getIncomeTotals(dateFilter),
        Advance.find({ status: "Active" }),
        Payroll.aggregate([
            { $match: { month, year, "payment.status": "Paid" } },
            {
                $project: {
                    netSalary: {
                        $subtract: [
                            {
                                $add: [
                                    { $ifNull: ["$earnings.basic", 0] },
                                    { $ifNull: ["$earnings.hra", 0] },
                                    { $ifNull: ["$earnings.bonus", 0] },
                                ],
                            },
                            {
                                $add: [
                                    { $ifNull: ["$deductions.pf", 0] },
                                    { $ifNull: ["$deductions.ptax", 0] },
                                    { $ifNull: ["$deductions.esi", 0] },
                                    { $ifNull: ["$deductions.leaveDeduction", 0] },
                                ],
                            },
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: null,
                    totalSalaryPaid: { $sum: "$netSalary" },
                },
            },
        ]),
        buildBarChartData(month, year),
    ]);

    const totalExpenses = expensesAgg.reduce((s, e) => s + e.total, 0);
    const totalIncome = incomeAgg.reduce((s, i) => s + i.total, 0);
    const totalAdvances = activeAdvances.reduce((s, a) => s + Math.max(0, a.amount - a.paid), 0);
    const totalSalaryPaid = payrolls[0]?.totalSalaryPaid || 0;

    return {
        totalExpenses,
        totalIncome,
        totalAdvances,
        totalSalaryPaid,
        profit: totalIncome - totalExpenses - totalSalaryPaid,
        expenseByCategory: expensesAgg,
        incomeBySource: incomeAgg,
        barChartData,
    };
};

const getReport = async (month, year) => {
    const { start, end } = monthRange(month, year);
    const dateFilter = { $gte: start, $lte: end };

    const [expenses, income, advances, payrolls] = await Promise.all([
        Expense.find({ date: dateFilter }).sort({ date: -1 }),
        Income.find({ date: dateFilter }).sort({ date: -1 }),
        Advance.find().populate("employee", "firstName lastName employeeId").sort({ date: -1 }),
        Payroll.aggregate([
            { $match: { month, year, "payment.status": "Paid" } },
            {
                $project: {
                    netSalary: {
                        $subtract: [
                            {
                                $add: [
                                    { $ifNull: ["$earnings.basic", 0] },
                                    { $ifNull: ["$earnings.hra", 0] },
                                    { $ifNull: ["$earnings.bonus", 0] },
                                ],
                            },
                            {
                                $add: [
                                    { $ifNull: ["$deductions.pf", 0] },
                                    { $ifNull: ["$deductions.ptax", 0] },
                                    { $ifNull: ["$deductions.esi", 0] },
                                    { $ifNull: ["$deductions.leaveDeduction", 0] },
                                ],
                            },
                        ],
                    },
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$netSalary" },
                },
            },
        ]),
    ]);

    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const totalIncome = income.reduce((s, i) => s + i.amount, 0);
    const totalSalaryPaid = payrolls[0]?.total || 0;
    const totalAdvOutstanding = advances
        .filter(a => a.status === "Active")
        .reduce((s, a) => s + Math.max(0, a.amount - a.paid), 0);

    return {
        month, year,
        expenses,
        income,
        advances,
        summary: {
            totalIncome,
            totalExpenses,
            totalSalaryPaid,
            totalAdvOutstanding,
            grossProfit: totalIncome - totalExpenses,
            netProfit: totalIncome - totalExpenses - totalSalaryPaid,
        },
    };
};

module.exports = { getStats, getReport };
