// @ts-nocheck

const Payroll = require("../../models/Payroll");
const Employee = require("../../models/Employee");
const { parseInteger, buildPayrollFilter, buildPayrollSummaryStats } = require("../../utils/payrollHelpers");
const { withStatus } = require("./payrollSharedService");

const getPayrolls = async (query, user) => {
  const filter = buildPayrollFilter(query || {}, user);

  if (filter === null) {
    throw withStatus("Employee account is not linked to an employee profile", 400);
  }

  const payrolls = await Payroll.find(filter)
    .populate("employee", "firstName lastName employeeId department designation joiningDate salary address documents bankInfo")
    .sort({ year: -1, month: -1, updatedAt: -1, createdAt: -1 });

  return {
    count: payrolls.length,
    payrolls,
  };
};

const getPayrollById = async (id) => {
  const payroll = await Payroll.findById(id).populate(
    "employee",
    "firstName lastName employeeId department designation joiningDate salary address documents bankInfo"
  );

  if (!payroll) {
    throw withStatus("Payroll record not found", 404);
  }

  return payroll;
};

const getPayrollStats = async (query) => {
  const month = parseInteger(query?.month) || new Date().getMonth() + 1;
  const year = parseInteger(query?.year) || new Date().getFullYear();

  const filter = { month, year };

  const [records, totalEmployees] = await Promise.all([
    Payroll.find(filter),
    Employee.countDocuments({ status: "Active" }),
  ]);

  return {
    ...buildPayrollSummaryStats(records),
    totalEmployees,
  };
};

module.exports = {
  getPayrolls,
  getPayrollById,
  getPayrollStats,
};
