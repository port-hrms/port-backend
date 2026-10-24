// @ts-nocheck

const Leave = require("../models/Leave");
const Attendance = require("../models/Attendance");
const User = require("../models/User");
const notificationService = require("./notificationService");
const Holiday = require("../models/Holiday");
const { buildDateRangeForDay } = require("../utils/attendanceHelpers");
const { isWeeklyOff } = require("../utils/attendanceTime");
const {
  buildLeavesFilter,
  getCurrentYearRange,
  buildOverlapQuery,
  ALLOWED_UPDATE_STATUSES,
} = require("../utils/leaveHelpers");

// Sync attendance with an approved / rejected / cancelled leave.
// Days are "YYYY-MM-DD" keys stored as UTC midnight (same as check-in).
// Weekly offs and holidays are skipped, and a day the employee actually
// worked (has a check-in) is never overwritten.
const syncLeaveAttendance = async (leave, status, actorId = null) => {
  const leaveNote = (action) => ({ at: new Date(), by: actorId, byName: "", action: "leave", reason: `${leave.leaveType} ${action}` });
  const employeeId = leave.employee._id || leave.employee;
  const startStr = new Date(leave.startDate).toISOString().slice(0, 10);
  const endStr = new Date(leave.endDate).toISOString().slice(0, 10);

  const holidays = await Holiday.find({
    isApproved: { $ne: false },
    date: { $lte: new Date(`${endStr}T23:59:59.999Z`) },
    $or: [{ endDate: null }, { endDate: { $gte: new Date(`${startStr}T00:00:00.000Z`) } }, { date: { $gte: new Date(`${startStr}T00:00:00.000Z`) } }],
  }).select("date endDate");
  const isHoliday = (dayStr) => holidays.some((h) => {
    const from = new Date(h.date).toISOString().slice(0, 10);
    const to = h.endDate ? new Date(h.endDate).toISOString().slice(0, 10) : from;
    return dayStr >= from && dayStr <= to;
  });

  for (let d = new Date(`${startStr}T00:00:00.000Z`); d.toISOString().slice(0, 10) <= endStr; d.setUTCDate(d.getUTCDate() + 1)) {
    const dayStr = d.toISOString().slice(0, 10);
    const dayRange = buildDateRangeForDay(dayStr);

    if (status === "Approved") {
      if (isWeeklyOff(dayStr) || isHoliday(dayStr)) continue;
      const existing = await Attendance.findOne({ employee: employeeId, date: dayRange });
      if (existing?.checkIn) continue; // they worked that day — keep the real record
      if (existing) {
        existing.status = "On Leave";
        existing.leaveType = leave.leaveType;
        existing.checkIn = "";
        existing.checkOut = "";
        existing.hoursWorked = 0;
        existing.history.push(leaveNote("approved"));
        await existing.save();
      } else {
        await Attendance.create({
          employee: employeeId,
          date: new Date(`${dayStr}T00:00:00.000Z`),
          status: "On Leave",
          leaveType: leave.leaveType,
          source: "leave",
          history: [leaveNote("approved")],
        });
      }
    } else if (status === "Rejected" || status === "Cancelled") {
      await Attendance.deleteOne({ employee: employeeId, date: dayRange, status: "On Leave" });
    }
  }
};

const withStatus = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getLeaves = async (query) => {
  const filter = buildLeavesFilter(query || {});

  return Leave.find(filter)
    .populate("employee", "firstName lastName email designation")
    .populate("approvedBy", "name email")
    .sort({ createdAt: -1 });
};

const getLeaveStats = async (employeeId) => {
  const { startOfYear, endOfYear } = getCurrentYearRange();

  const [totalApproved, totalPending, totalRejected] = await Promise.all([
    Leave.countDocuments({
      employee: employeeId,
      status: "Approved",
      startDate: { $gte: startOfYear, $lte: endOfYear },
    }),
    Leave.countDocuments({
      employee: employeeId,
      status: "Pending",
      startDate: { $gte: startOfYear, $lte: endOfYear },
    }),
    Leave.countDocuments({
      employee: employeeId,
      status: "Rejected",
      startDate: { $gte: startOfYear, $lte: endOfYear },
    }),
  ]);

  const approvedLeaves = await Leave.find({
    employee: employeeId,
    status: "Approved",
    startDate: { $gte: startOfYear, $lte: endOfYear },
  });

  const totalDaysUsed = approvedLeaves.reduce((sum, leave) => sum + leave.numberOfDays, 0);

  return {
    totalApproved,
    totalPending,
    totalRejected,
    totalDaysUsed,
  };
};

const createLeave = async ({ employee, leaveType, startDate, endDate, numberOfDays, reason }) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    throw withStatus("Start date must be before end date", 400);
  }

  const overlapping = await Leave.findOne(buildOverlapQuery(employee, start, end));
  if (overlapping) {
    throw withStatus("You already have a leave request for overlapping dates", 400);
  }

  const newLeave = new Leave({
    employee,
    leaveType,
    startDate: start,
    endDate: end,
    numberOfDays,
    reason,
    status: "Pending",
  });

  await newLeave.save();
  await newLeave.populate("employee", "firstName lastName email designation");

  const employeeName = `${newLeave.employee?.firstName || ""} ${newLeave.employee?.lastName || ""}`.trim();
  await notificationService.createNotification({
    recipientRole: "admin",
    title: "New leave request",
    message: `${employeeName || "An employee"} requested ${leaveType} from ${start.toDateString()} to ${end.toDateString()}.`,
    type: "leave_request",
    link: "/leaves",
  });

  return newLeave;
};

const getRecentLeaves = async (employeeId) => {
  return Leave.find({ employee: employeeId })
    .sort({ createdAt: -1 })
    .limit(5);
};

const updateLeave = async (leaveId, { status, managerNotes }, approvedBy) => {
  if (!ALLOWED_UPDATE_STATUSES.includes(status)) {
    throw withStatus("Invalid status", 400);
  }

  const leave = await Leave.findByIdAndUpdate(
    leaveId,
    {
      status,
      managerNotes: managerNotes || "",
      approvedBy: approvedBy || null,
      updatedAt: new Date(),
    },
    { new: true }
  ).populate("employee", "firstName lastName email designation");

  if (!leave) {
    throw withStatus("Leave request not found", 404);
  }

  // Sync attendance records when leave is approved or rejected
  if (["Approved", "Rejected", "Cancelled"].includes(status)) {
    await syncLeaveAttendance(leave, status, approvedBy);
  }

  if (["Approved", "Rejected"].includes(status)) {
    const employeeUser = await User.findOne({ employee: leave.employee?._id });
    if (employeeUser) {
      const employeeName = `${leave.employee?.firstName || ""} ${leave.employee?.lastName || ""}`.trim();
      await notificationService.createNotification({
        recipientUser: employeeUser._id,
        title: `Leave ${status.toLowerCase()}`,
        message: `${employeeName || "Your"} leave request for ${leave.leaveType} was ${status.toLowerCase()}.`,
        type: "leave_status",
        link: "/leaves",
      });
    }
  }

  return leave;
};

// restrictToEmployee: when set (employee users), only their own Pending request can be deleted
const deleteLeave = async (leaveId, restrictToEmployee = null) => {
  const leave = await Leave.findById(leaveId);

  if (!leave || (restrictToEmployee && String(leave.employee) !== String(restrictToEmployee))) {
    throw withStatus("Leave request not found", 404);
  }
  if (restrictToEmployee && leave.status !== "Pending") {
    throw withStatus("Only pending requests can be withdrawn", 400);
  }

  await leave.deleteOne();
  return true;
};

module.exports = {
  getLeaves,
  getLeaveStats,
  createLeave,
  getRecentLeaves,
  updateLeave,
  deleteLeave,
};
