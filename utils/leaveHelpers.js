// @ts-nocheck

const buildLeavesFilter = ({ employeeId, status }) => {
  const filter = {};
  if (employeeId) filter.employee = employeeId;
  if (status) filter.status = status;
  return filter;
};

const getCurrentYearRange = () => {
  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31);
  return { startOfYear, endOfYear };
};

const buildOverlapQuery = (employee, startDate, endDate) => ({
  employee,
  status: { $in: ["Pending", "Approved"] },
  $or: [{ startDate: { $lte: endDate }, endDate: { $gte: startDate } }],
});

const ALLOWED_UPDATE_STATUSES = ["Approved", "Rejected", "Cancelled"];

module.exports = {
  buildLeavesFilter,
  getCurrentYearRange,
  buildOverlapQuery,
  ALLOWED_UPDATE_STATUSES,
};
