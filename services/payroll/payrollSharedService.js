// @ts-nocheck

const Employee = require("../../models/Employee");
const Attendance = require("../../models/Attendance");
const { getMonthRange, summarizeAttendance } = require("../../utils/payrollHelpers");

const withStatus = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getEmployeeOrThrow = async (employeeId) => {
  const employee = await Employee.findById(employeeId);
  if (!employee) {
    throw withStatus("Employee not found", 404);
  }
  return employee;
};

const getAttendanceSummary = async (employeeId, month, year) => {
  const { startDate, endDate } = getMonthRange(month, year);
  const attendanceRecords = await Attendance.find({
    employee: employeeId,
    date: { $gte: startDate, $lte: endDate },
  });

  return summarizeAttendance(attendanceRecords);
};

const ensurePayrollNotExists = async (Payroll, employeeId, month, year, employee) => {
  const existing = await Payroll.findOne({ employee: employeeId, month, year });

  if (existing) {
    throw withStatus(
      `Payroll for ${employee.firstName} ${employee.lastName} already exists for ${month}/${year}`,
      400
    );
  }
};

module.exports = {
  withStatus,
  toNumber,
  getEmployeeOrThrow,
  getAttendanceSummary,
  ensurePayrollNotExists,
};
