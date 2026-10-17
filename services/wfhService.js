// @ts-nocheck

const WFHRequest = require("../models/WFHRequest");
const User = require("../models/User");
const notificationService = require("./notificationService");

const withStatus = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// ─── Build date range for a given day in IST ─────────────────
const dayRange = (date = new Date()) => {
  const dateStr = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date
    : new Date(date).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(`${dateStr}T23:59:59.999Z`);
  return { start, end, dateStr };
};

// ─── Apply for WFH ────────────────────────────────────────────
const applyWFH = async ({ employee, startDate, endDate, numberOfDays, reason }) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  if (start > end) throw withStatus("Start date must be before or equal to end date", 400);

  // Check for overlapping pending/approved WFH requests
  const overlap = await WFHRequest.findOne({
    employee,
    status: { $in: ["Pending", "Approved"] },
    startDate: { $lte: end },
    endDate: { $gte: start },
  });
  if (overlap) throw withStatus("You already have a WFH request for overlapping dates", 400);

  const wfh = await WFHRequest.create({
    employee,
    startDate: start,
    endDate: end,
    numberOfDays,
    reason,
    status: "Pending",
  });

  await wfh.populate("employee", "firstName lastName designation");
  const empName = `${wfh.employee?.firstName || ""} ${wfh.employee?.lastName || ""}`.trim();

  await notificationService.createNotification({
    recipientRole: "admin",
    title: "New WFH Request",
    message: `${empName || "An employee"} requested Work From Home from ${start.toDateString()} to ${end.toDateString()}.`,
    type: "wfh_request",
    link: "/wfh",
  });

  return wfh;
};

// ─── Get WFH requests (employee sees own, admin sees all/filtered) ─
const getWFHRequests = async (query = {}) => {
  const filter = {};
  if (query.employeeId) filter.employee = query.employeeId;
  if (query.status) filter.status = query.status;

  return WFHRequest.find(filter)
    .populate("employee", "firstName lastName employeeId department designation")
    .populate("approvedBy", "name email")
    .sort({ createdAt: -1 });
};

// ─── WFH stats — per-employee or aggregate (admin/HR) ─────────
const getWFHStats = async (employeeId) => {
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  const endOfYear   = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);

  // Base filter — scoped to employee if provided, else org-wide
  const base = employeeId
    ? { employee: employeeId, startDate: { $gte: startOfYear, $lte: endOfYear } }
    : { startDate: { $gte: startOfYear, $lte: endOfYear } };

  const [approved, pending, rejected] = await Promise.all([
    WFHRequest.countDocuments({ ...base, status: "Approved" }),
    WFHRequest.countDocuments({ ...base, status: "Pending" }),
    WFHRequest.countDocuments({ ...base, status: "Rejected" }),
  ]);

  const approvedDocs = await WFHRequest.find({ ...base, status: "Approved" });
  const totalDays = approvedDocs.reduce((sum, r) => sum + r.numberOfDays, 0);

  return { approved, pending, rejected, totalDays };
};

// ─── Check if TODAY is an approved WFH day for an employee ────
const getTodayWFH = async (employeeId, date = new Date()) => {
  if (!employeeId) return null;
  const { start, end } = dayRange(date);

  return WFHRequest.findOne({
    employee: employeeId,
    status: { $in: ["Approved", "approved"] },
    startDate: { $lte: end },
    endDate:   { $gte: start },
  });
};

// ─── Admin: Approve / Reject ───────────────────────────────────
const updateWFHStatus = async (wfhId, { status, managerNotes }, approvedBy) => {
  const ALLOWED = ["Approved", "Rejected", "Cancelled"];
  if (!ALLOWED.includes(status)) throw withStatus("Invalid status", 400);

  const wfh = await WFHRequest.findByIdAndUpdate(
    wfhId,
    { status, managerNotes: managerNotes || "", approvedBy: approvedBy || null },
    { new: true }
  ).populate("employee", "firstName lastName email designation");

  if (!wfh) throw withStatus("WFH request not found", 404);

  if (["Approved", "Rejected"].includes(status)) {
    const empUser = await User.findOne({ employee: wfh.employee?._id });
    if (empUser) {
      const empName = `${wfh.employee?.firstName || ""} ${wfh.employee?.lastName || ""}`.trim();
      await notificationService.createNotification({
        recipientUser: empUser._id,
        title: `WFH Request ${status}`,
        message: `Your WFH request from ${new Date(wfh.startDate).toDateString()} to ${new Date(wfh.endDate).toDateString()} has been ${status.toLowerCase()}.`,
        type: "wfh_status",
        link: "/wfh",
      });
    }
  }

  return wfh;
};

// ─── Employee: Cancel (Pending only) ──────────────────────────
const cancelWFH = async (wfhId, employeeId) => {
  const wfh = await WFHRequest.findOne({ _id: wfhId, employee: employeeId });
  if (!wfh) throw withStatus("WFH request not found", 404);
  if (wfh.status !== "Pending") throw withStatus("Only pending WFH requests can be cancelled", 400);

  wfh.status = "Cancelled";
  await wfh.save();
  return wfh;
};

module.exports = {
  applyWFH,
  getWFHRequests,
  getWFHStats,
  getTodayWFH,
  updateWFHStatus,
  cancelWFH,
};
