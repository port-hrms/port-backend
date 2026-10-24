// @ts-nocheck


const { hasAdminAccess, ownEmployeeId } = require("../../utils/accessHelpers");
const attendanceService = require("../../services/attendance/attendanceService");
const { getAttendancePolicy } = require("../../utils/attendanceTime");
const { sendSuccess, sendError, sendBadRequest } = require("../../utils/responseHandler");


// Who is making the change (stored in the record's history)
const actorOf = (req) => ({ id: req.user?._id, name: req.user?.name || "" });

const getAttendance = async (req, res) => {
  try {
    const records = await attendanceService.getAttendance(req.query);
    return sendSuccess(res, records);
  } catch (error) {
    return sendError(res, "Error fetching attendance records", 500, error.message);
  }
};


const getTodaySummary = async (req, res) => {
  try {
    const summary = await attendanceService.getTodaySummary(req.query.date);
    return sendSuccess(res, summary);
  } catch (error) {
    return sendError(res, "Error fetching today's summary", 500, error.message);
  }
};

// Shift rules (single source) for the client
const getPolicy = (req, res) => sendSuccess(res, getAttendancePolicy());

const markAttendance = async (req, res) => {
  try {
    const record = await attendanceService.markAttendance(req.body, actorOf(req));
    return sendSuccess(res, record, "Attendance marked successfully", 201);
  } catch (error) {
    if (error.code === 11000) {
      return sendBadRequest(res, "Attendance already marked for this employee on this date");
    }
    return sendError(res, error.message, error.statusCode || 400, error.message);
  }
};

const markBulkAttendance = async (req, res) => {
  try {
    const { result, message } = await attendanceService.markBulkAttendance(req.body, actorOf(req));
    return sendSuccess(res, result, message, 201);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.message);
  }
};

const updateAttendance = async (req, res) => {
  try {
    const record = await attendanceService.updateAttendance(req.params.id, req.body, actorOf(req));
    return sendSuccess(res, record, "Attendance updated successfully");
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.message);
  }
};

const deleteAttendance = async (req, res) => {
  try {
    await attendanceService.deleteAttendance(req.params.id, req.body, actorOf(req));
    return sendSuccess(res, {}, "Attendance record deleted. You can restore it from “Show deleted”.");
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500, error.message);
  }
};

const getMonthlyRegister = async (req, res) => {
  try {
    return sendSuccess(res, await attendanceService.getMonthlyRegister(req.query));
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500, error.message);
  }
};

const getDeletedAttendance = async (req, res) => {
  try {
    return sendSuccess(res, await attendanceService.getDeletedAttendance(req.query));
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500, error.message);
  }
};

const restoreAttendance = async (req, res) => {
  try {
    const record = await attendanceService.restoreAttendance(req.params.id, req.body, actorOf(req));
    return sendSuccess(res, record, "Attendance record restored");
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500, error.message);
  }
};

const getAttendanceHistory = async (req, res) => {
  try {
    return sendSuccess(res, await attendanceService.getAttendanceHistory(req.params.id));
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500, error.message);
  }
};

const getEmployeeMonthlyReport = async (req, res) => {
  try {
    // Employees may only read their own attendance; admins/HR staff can read anyone's
    if (!(await hasAdminAccess(req.user))) {
      const own = ownEmployeeId(req.user);
      if (!own || own !== String(req.params.employeeId)) {
        return res.status(403).json({ success: false, message: "You can only view your own attendance" });
      }
    }
    const report = await attendanceService.getEmployeeMonthlyReport(
      req.params.employeeId,
      req.query
    );
    return sendSuccess(res, report);
  } catch (error) {
    return sendError(res, "Error generating monthly report", 500, error.message);
  }
};

module.exports = {
  getMonthlyRegister,
  getDeletedAttendance,
  restoreAttendance,
  getAttendanceHistory,
  getPolicy,
  getAttendance,
  getTodaySummary,
  markAttendance,
  markBulkAttendance,
  updateAttendance,
  deleteAttendance,
  getEmployeeMonthlyReport,
};