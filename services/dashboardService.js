// @ts-nocheck

const Employee = require("../models/Employee");
const { NOT_DELETED } = require("../utils/employeeHelpers");
const { buildDateRangeForDay } = require("../utils/attendanceHelpers");
const { todayIST } = require("../utils/attendanceTime");
const Attendance = require("../models/Attendance");
const Payroll = require("../models/Payroll");
const Performance = require("../models/Performance");
const Tracking = require("../models/Tracking");
const User = require("../models/User");
const Leave = require("../models/Leave");
const Client = require("../models/Client");
const Quotation = require("../models/Quotation");
const Invoice = require("../models/Invoice");
const {
  createAttendanceSummary,
  createGradeDistribution,
  createEmployeeAttendanceSummary,
  createEmployeeProfilePayload,
} = require("../utils/dashboardHelpers");
const { buildPayrollSummaryStats } = require("../utils/payrollHelpers");

const withStatus = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getDashboardStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [totalEmployees, activeEmployees, onLeaveEmployees, inactiveEmployees] = await Promise.all([
    Employee.countDocuments(NOT_DELETED),
    Employee.countDocuments({ ...NOT_DELETED, status: "Active" }),
    Employee.countDocuments({ ...NOT_DELETED, status: "On Leave" }),
    Employee.countDocuments({ ...NOT_DELETED, status: "Inactive" }),
  ]);

  const departmentStats = await Employee.aggregate([
    { $match: NOT_DELETED },
    { $group: { _id: "$department", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // Attendance days are stored as UTC midnight of the IST date
  const attendanceToday = await Attendance.aggregate([
    { $match: { date: buildDateRangeForDay(todayIST()) } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const attendanceSummary = createAttendanceSummary(attendanceToday);

  const payrollRecords = await Payroll.find({ month: currentMonth, year: currentYear });
  const payrollStats = buildPayrollSummaryStats(payrollRecords);

  const performanceRecords = await Performance.find({ year: currentYear });
  const avgScore = performanceRecords.length > 0
    ? Math.round(performanceRecords.reduce((sum, record) => sum + (record.overallScore || 0), 0) / performanceRecords.length)
    : 0;
  const gradeDistribution = createGradeDistribution(performanceRecords);

  const recentEmployees = await Employee.find(NOT_DELETED)
    .sort({ createdAt: -1 })
    .limit(5)
    .select("firstName lastName email department designation employeeId status createdAt");

  const [pendingRequests, approvedRequests, rejectedRequests, activeLeavesToday] = await Promise.all([
    Leave.countDocuments({ status: "Pending" }),
    Leave.countDocuments({ status: "Approved" }),
    Leave.countDocuments({ status: "Rejected" }),
    Leave.countDocuments({ status: "Approved", startDate: { $lte: today }, endDate: { $gte: today } }),
  ]);

  const recentLeaveRequests = await Leave.find()
    .populate("employee", "firstName lastName email department designation")
    .sort({ createdAt: -1 })
    .limit(5)
    .select("employee leaveType startDate endDate numberOfDays status createdAt reason managerNotes");

  const birthdayEmployees = await findTodaysBirthdays();

  return {
    employees: {
      total: totalEmployees,
      active: activeEmployees,
      onLeave: onLeaveEmployees,
      inactive: inactiveEmployees,
      departmentStats,
    },
    attendance: attendanceSummary,
    payroll: {
      totalExpense: payrollStats.totalPayroll,
      paid: payrollStats.paidCount,
      pending: payrollStats.pendingCount,
      totalRecords: payrollStats.totalRecords,
    },
    performance: {
      avgScore,
      gradeDistribution,
      totalReviews: performanceRecords.length,
    },
    leaves: {
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      activeToday: activeLeavesToday,
    },
    recentLeaveRequests,
    recentEmployees,
    birthdayEmployees,
    billing: await getBillingStats(),
  };
};

// Active employees whose birthday is today
const findTodaysBirthdays = () => {
  const now = new Date();
  return Employee.find({
    ...NOT_DELETED,
    dateOfBirth: { $exists: true, $ne: null },
    status: "Active",
    $expr: {
      $and: [
        { $eq: [{ $month: "$dateOfBirth" }, now.getMonth() + 1] },
        { $eq: [{ $dayOfMonth: "$dateOfBirth" }, now.getDate()] },
      ],
    },
  }).select("firstName lastName department designation avatar employeeId dateOfBirth");
};

// Employee dashboard extras: today's birthdays, without exposing anyone's birth date
const getEmployeeHighlights = async () => {
  const thisYear = new Date().getFullYear();
  const birthdays = await findTodaysBirthdays();
  return {
    birthdayEmployees: birthdays.map((e) => ({
      _id: e._id,
      firstName: e.firstName,
      lastName: e.lastName,
      department: e.department,
      designation: e.designation,
      avatar: e.avatar,
      age: thisYear - new Date(e.dateOfBirth).getFullYear(),
    })),
  };
};

const getEmployeeDashboardStats = async (userId) => {
  const user = await User.findById(userId).populate("employee");
  if (!user) {
    throw withStatus("User not found", 404);
  }

  if (!user.employee) {
    return {
      profile: {
        name: user.name,
        email: user.email,
        role: user.role,
        hasEmployeeRecord: false,
      },
      attendance: null,
      payroll: null,
      performance: null,
      tracking: null,
    };
  }

  const employee = user.employee;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const [attendanceRecords, todayAttendance, latestPayroll, latestPerformance, latestTracking] = await Promise.all([
    Attendance.find({ employee: employee._id, date: { $gte: monthStart, $lte: monthEnd } }).sort({ date: -1 }),
    Attendance.findOne({ employee: employee._id, date: { $gte: todayStart, $lt: todayEnd } }).sort({ date: -1 }),
    Payroll.findOne({ employee: employee._id }).sort({ year: -1, month: -1, createdAt: -1 }),
    Performance.findOne({ employee: employee._id }).sort({ year: -1, reviewDate: -1, createdAt: -1 }),
    employee.isFieldAgent
      ? Tracking.findOne({ agent: employee._id }).sort({ date: -1, createdAt: -1 })
      : Promise.resolve(null),
  ]);

  const { summary, attendanceRate } = createEmployeeAttendanceSummary(attendanceRecords);

  return {
    profile: createEmployeeProfilePayload(employee, user),
    attendance: {
      summary,
      attendanceRate,
      today: todayAttendance,
      recent: attendanceRecords.slice(0, 5),
    },
    payroll: latestPayroll,
    performance: latestPerformance,
    tracking: latestTracking,
  };
};

const getBillingStats = async () => {
  const totalClients = await Client.countDocuments({ is_deleted: false });
  const totalQuotations = await Quotation.countDocuments({ is_deleted: false });
  const totalInvoices = await Invoice.countDocuments({ is_deleted: false });

  const revenueResult = await Invoice.aggregate([
    { $match: { is_deleted: false, paymentStatus: "Paid" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const revenueGenerated = revenueResult.length > 0 ? revenueResult[0].total : 0;

  const pendingAmountResult = await Invoice.aggregate([
    { $match: { is_deleted: false, paymentStatus: { $in: ["Unpaid", "Partial", "Overdue"] } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const pendingPayments = pendingAmountResult.length > 0 ? pendingAmountResult[0].total : 0;

  return { totalClients, totalQuotations, totalInvoices, revenueGenerated, pendingPayments };
};

module.exports = {
  getDashboardStats,
  getEmployeeDashboardStats,
  getEmployeeHighlights,
};
