// @ts-nocheck

const Invoice = require("../models/Invoice");
const { buildDateRangeForDay } = require("./attendanceHelpers");
const { todayIST } = require("./attendanceTime");

// Money totals for live invoices, shared by the dashboard and the invoices page.
// "Partial" counts only what has actually been received (amountPaid), and an
// unpaid invoice past its due date is overdue whatever its stored status says.
// collectedThisMonth counts fully paid invoices by paymentDate (partial payments
// have no date of their own yet).
const getInvoiceMoneyStats = async () => {
  const todayStr = todayIST();
  const todayStart = buildDateRangeForDay(todayStr).$gte;
  // paymentDate is a real timestamp, so the month starts at midnight IST
  const monthStart = new Date(`${todayStr.slice(0, 7)}-01T00:00:00+05:30`);

  const [result] = await Invoice.aggregate([
    { $match: { is_deleted: false } },
    {
      $project: {
        amount: { $ifNull: ["$amount", 0] },
        paymentStatus: 1,
        paidThisMonth: { $and: [{ $eq: ["$paymentStatus", "Paid"] }, { $gte: ["$paymentDate", monthStart] }] },
        received: {
          $switch: {
            branches: [
              { case: { $eq: ["$paymentStatus", "Paid"] }, then: { $ifNull: ["$amount", 0] } },
              {
                case: { $eq: ["$paymentStatus", "Partial"] },
                then: { $min: [{ $ifNull: ["$amountPaid", 0] }, { $ifNull: ["$amount", 0] }] },
              },
            ],
            default: 0,
          },
        },
        isOverdue: {
          $and: [
            { $ne: ["$paymentStatus", "Paid"] },
            { $or: [{ $eq: ["$paymentStatus", "Overdue"] }, { $lt: ["$dueDate", todayStart] }] },
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        revenueGenerated: { $sum: "$received" },
        pendingPayments: { $sum: { $subtract: ["$amount", "$received"] } },
        collectedThisMonth: { $sum: { $cond: ["$paidThisMonth", "$amount", 0] } },
        overdueCount: { $sum: { $cond: ["$isOverdue", 1, 0] } },
        overdueAmount: { $sum: { $cond: ["$isOverdue", { $subtract: ["$amount", "$received"] }, 0] } },
        unpaidCount: {
          $sum: { $cond: [{ $and: [{ $eq: ["$paymentStatus", "Unpaid"] }, { $not: ["$isOverdue"] }] }, 1, 0] },
        },
      },
    },
  ]);

  return {
    revenueGenerated: result?.revenueGenerated || 0,
    pendingPayments: result?.pendingPayments || 0,
    collectedThisMonth: result?.collectedThisMonth || 0,
    overdueCount: result?.overdueCount || 0,
    overdueAmount: result?.overdueAmount || 0,
    unpaidCount: result?.unpaidCount || 0,
  };
};

module.exports = { getInvoiceMoneyStats };
