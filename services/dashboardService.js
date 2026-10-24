// @ts-nocheck

const Employee = require("../models/Employee");
const { NOT_DELETED } = require("../utils/employeeHelpers");
const { buildDateRangeForDay, buildDateRangeForMonth } = require("../utils/attendanceHelpers");
const { todayIST, isWeeklyOff } = require("../utils/attendanceTime");
const Attendance = require("../models/Attendance");
const Payroll = require("../models/Payroll");
const Performance = require("../models/Performance");
const Tracking = require("../models/Tracking");
const User = require("../models/User");
const Leave = require("../models/Leave");
const Client = require("../models/Client");
const WFHRequest = require("../models/WFHRequest");
const Application = require("../models/Application");
const Holiday = require("../models/Holiday");
const {
  createAttendanceSummary,
  createEmployeeAttendanceSummary,
  createEmployeeProfilePayload,
} = require("../utils/dashboardHelpers");
const { buildPayrollSummaryStats } = require("../utils/payrollHelpers");
const { getInvoiceMoneyStats } = require("../utils/invoiceStats");

const withStatus = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// ─── Admin dashboard ─────────────────────────────────────────
// Each section loads independently and in parallel. A section that fails comes
// back as null (and is listed in failedSections) so the rest of the page still works.
// Every "today" / "this month" is the IST calendar day, whatever the server's
// timezone; date-only fields are stored as UTC midnight of that IST day.

const DAY_MS = 24 * 60 * 60 * 1000;

const loadEmployees = async ({ todayRange, currentMonth, currentYear }) => {
  const monthRange = buildDateRangeForMonth(currentMonth, currentYear);
  const [[result], joinedThisMonth, leftThisMonth] = await Promise.all([
    Employee.aggregate([
    { $match: NOT_DELETED },
    {
      $facet: {
        byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
        departmentStats: [
          { $group: { _id: { $ifNull: ["$department", "Unassigned"] }, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
      },
    },
    ]),
    Employee.countDocuments({ ...NOT_DELETED, joiningDate: monthRange }),
    // endingDate is the last working day; once it has passed, the person has left
    Employee.countDocuments({ ...NOT_DELETED, endingDate: { $gte: monthRange.$gte, $lte: todayRange.$lte } }),
  ]);
  const countFor = (status) => result.byStatus.find((s) => s._id === status)?.count || 0;
  return {
    total: result.byStatus.reduce((sum, s) => sum + s.count, 0),
    active: countFor("Active"),
    onLeave: countFor("On Leave"),
    inactive: countFor("Inactive"),
    departmentStats: result.departmentStats,
    joinedThisMonth,
    leftThisMonth,
  };
};

const loadAttendance = async ({ todayRange }) => {
  const attendanceToday = await Attendance.aggregate([
    { $match: { date: todayRange } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  return createAttendanceSummary(attendanceToday);
};

const loadPayroll = async ({ currentMonth, currentYear }) => {
  // One record per employee per month, so this stays small; only the money fields are read
  const records = await Payroll.find({ month: currentMonth, year: currentYear })
    .select("earnings deductions payment")
    .lean();
  const stats = buildPayrollSummaryStats(records);
  return {
    totalExpense: stats.totalPayroll,
    paid: stats.paidCount,
    pending: stats.pendingCount,
    totalRecords: stats.totalRecords,
  };
};

const loadPerformance = async ({ currentYear }) => {
  const [result] = await Performance.aggregate([
    { $match: { year: currentYear } },
    { $group: { _id: null, avgScore: { $avg: { $ifNull: ["$overallScore", 0] } }, count: { $sum: 1 } } },
  ]);
  return {
    avgScore: result ? Math.round(result.avgScore) : 0,
    totalReviews: result?.count || 0,
  };
};

const loadOnLeaveToday = async ({ todayRange }) => {
  const leaves = await Leave.find({
    status: "Approved",
    startDate: { $lte: todayRange.$lte },
    endDate: { $gte: todayRange.$gte },
  })
    .populate("employee", "firstName lastName department designation avatar employeeId")
    .sort({ startDate: 1 })
    .select("employee leaveType startDate endDate");

  // One entry per person, even if they have overlapping approved leaves
  const seen = new Set();
  return leaves.filter((leave) => {
    const id = String(leave.employee?._id || leave._id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const loadRecentEmployees = () =>
  Employee.find(NOT_DELETED)
    .sort({ createdAt: -1 })
    .limit(5)
    .select("firstName lastName email department designation employeeId status joiningDate createdAt avatar");

const loadRecentLeaveRequests = () =>
  Leave.find()
    .populate("employee", "firstName lastName email department designation avatar")
    .sort({ createdAt: -1 })
    .limit(5)
    .select("employee leaveType startDate endDate numberOfDays status createdAt reason managerNotes");

// Pending count + when the oldest one was raised
const pendingSummary = async (Model) => {
  const [result] = await Model.aggregate([
    { $match: { status: "Pending" } },
    { $group: { _id: null, count: { $sum: 1 }, oldestAt: { $min: "$createdAt" } } },
  ]);
  return { count: result?.count || 0, oldestAt: result?.oldestAt || null };
};

// Everything waiting on an admin today, for the "Needs your attention" panel
const loadAttention = async ({ todayStr, todayRange, currentMonth, currentYear }) => {
  const contractWindowEnd = new Date(todayRange.$gte.getTime() + 30 * DAY_MS);

  const [
    pendingLeaves, pendingWfh, activeIds, payrollHeadcount, [payrollResult],
    newApplications, contractsEnding, holidayToday, nextHoliday,
  ] = await Promise.all([
    pendingSummary(Leave),
    pendingSummary(WFHRequest),
    Employee.find({ ...NOT_DELETED, status: "Active" }).distinct("_id"),
    Employee.countDocuments({ ...NOT_DELETED, status: { $ne: "Inactive" } }),
    Payroll.aggregate([
      { $match: { month: currentMonth, year: currentYear } },
      { $group: { _id: null, generated: { $sum: 1 }, paid: { $sum: { $cond: [{ $eq: ["$payment.status", "Paid"] }, 1, 0] } } } },
    ]),
    Application.countDocuments({ status: "New" }),
    Employee.find({ ...NOT_DELETED, status: { $ne: "Inactive" }, endingDate: { $gte: todayRange.$gte, $lte: contractWindowEnd } })
      .sort({ endingDate: 1 })
      .select("firstName lastName employeeId endingDate"),
    Holiday.findOne({
      isApproved: true,
      date: { $lte: todayRange.$lte },
      $or: [{ endDate: { $gte: todayRange.$gte } }, { endDate: null, date: { $gte: todayRange.$gte } }],
    }).select("name"),
    Holiday.findOne({ isApproved: true, date: { $gt: todayRange.$lte } }).sort({ date: 1 }).select("name date endDate type"),
  ]);

  const markedIds = await Attendance.distinct("employee", { date: todayRange, employee: { $in: activeIds } });
  const weeklyOff = isWeeklyOff(todayStr);

  return {
    pendingLeaves,
    pendingWfh,
    attendance: {
      expected: activeIds.length,
      marked: markedIds.length,
      isWorkingDay: !weeklyOff && !holidayToday,
      offReason: holidayToday?.name || (weeklyOff ? "Weekly off" : null),
    },
    payroll: {
      month: currentMonth,
      year: currentYear,
      headcount: payrollHeadcount,
      generated: payrollResult?.generated || 0,
      unpaid: (payrollResult?.generated || 0) - (payrollResult?.paid || 0),
    },
    newApplications,
    contractsEnding,
    nextHoliday,
  };
};

// Birthdays and work anniversaries from today through the next 6 days.
// Dates are stored as UTC midnight of the calendar date, so UTC getters read it back.
const CELEBRATION_DAYS = 7;
const loadCelebrations = async ({ todayRange }) => {
  const employees = await Employee.find({
    ...NOT_DELETED,
    status: { $ne: "Inactive" },
    $or: [{ dateOfBirth: { $ne: null } }, { joiningDate: { $ne: null } }],
  })
    .select("firstName lastName department designation avatar employeeId dateOfBirth joiningDate")
    .lean();

  const days = Array.from({ length: CELEBRATION_DAYS }, (_, i) => new Date(todayRange.$gte.getTime() + i * DAY_MS));
  const sameDay = (stored, day) =>
    stored && stored.getUTCMonth() === day.getUTCMonth() && stored.getUTCDate() === day.getUTCDate();

  const events = [];
  employees.forEach(({ dateOfBirth, joiningDate, ...person }) => {
    days.forEach((day, daysAway) => {
      const year = day.getUTCFullYear();
      if (sameDay(dateOfBirth, day)) {
        events.push({ type: "birthday", daysAway, date: day, years: year - dateOfBirth.getUTCFullYear(), employee: person });
      }
      if (sameDay(joiningDate, day) && year > joiningDate.getUTCFullYear()) {
        events.push({ type: "anniversary", daysAway, date: day, years: year - joiningDate.getUTCFullYear(), employee: person });
      }
    });
  });
  return events.sort((a, b) => a.daysAway - b.daysAway);
};

// Every pending leave, oldest first — the dashboard is where admins approve them
const loadPendingLeaves = () =>
  Leave.find({ status: "Pending" })
    .populate("employee", "firstName lastName email department designation avatar")
    .sort({ createdAt: 1 })
    .limit(50)
    .select("employee leaveType startDate endDate numberOfDays status createdAt reason");

// Section name = key in the response
const DASHBOARD_SECTIONS = {
  employees: loadEmployees,
  attendance: loadAttendance,
  payroll: loadPayroll,
  performance: loadPerformance,
  onLeaveToday: loadOnLeaveToday,
  recentEmployees: loadRecentEmployees,
  recentLeaveRequests: loadRecentLeaveRequests,
  pendingLeaves: loadPendingLeaves,
  attention: loadAttention,
  celebrations: loadCelebrations,
  billing: () => getBillingStats(),
};

// Loaded only when asked for by name (the employee dashboard's HR leave panel)
const ON_REQUEST_SECTIONS = ["recentLeaveRequests"];
const DEFAULT_SECTIONS = Object.keys(DASHBOARD_SECTIONS).filter((name) => !ON_REQUEST_SECTIONS.includes(name));

// sections: optional list of section names to load (default: everything the admin home shows)
const getDashboardStats = async (sections = DEFAULT_SECTIONS) => {
  const unknown = sections.filter((name) => !DASHBOARD_SECTIONS[name]);
  if (unknown.length) {
    throw withStatus(`Unknown dashboard section: ${unknown.join(", ")}`, 400);
  }

  const todayStr = todayIST();
  const [currentYear, currentMonth] = todayStr.split("-").map(Number);
  const ctx = { todayStr, todayRange: buildDateRangeForDay(todayStr), currentYear, currentMonth };

  const results = await Promise.allSettled(sections.map((name) => DASHBOARD_SECTIONS[name](ctx)));

  const data = { failedSections: [] };
  results.forEach((result, i) => {
    const name = sections[i];
    if (result.status === "fulfilled") {
      data[name] = result.value;
    } else {
      console.error(`Dashboard section "${name}" failed:`, result.reason);
      data[name] = null;
      data.failedSections.push(name);
    }
  });
  return data;
};

// Active employees whose birthday is today (IST). Birth dates are stored as UTC midnight,
// so $month / $dayOfMonth (UTC) give the calendar date that was entered.
const findTodaysBirthdays = () => {
  const [, month, day] = todayIST().split("-").map(Number);
  return Employee.find({
    ...NOT_DELETED,
    dateOfBirth: { $exists: true, $ne: null },
    status: "Active",
    $expr: {
      $and: [
        { $eq: [{ $month: "$dateOfBirth" }, month] },
        { $eq: [{ $dayOfMonth: "$dateOfBirth" }, day] },
      ],
    },
  }).select("firstName lastName department designation avatar employeeId dateOfBirth");
};

// Employee dashboard extras: today's birthdays, without exposing anyone's birth date
const getEmployeeHighlights = async () => {
  const thisYear = Number(todayIST().slice(0, 4));
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
  const [totalClients, money] = await Promise.all([
    Client.countDocuments({ is_deleted: false }),
    getInvoiceMoneyStats(),
  ]);

  return {
    totalClients,
    revenueGenerated: money.revenueGenerated,
    collectedThisMonth: money.collectedThisMonth,
    pendingPayments: money.pendingPayments,
    overdueAmount: money.overdueAmount,
    overdueCount: money.overdueCount,
  };
};

module.exports = {
  getDashboardStats,
  getEmployeeDashboardStats,
  getEmployeeHighlights,
};
