// @ts-nocheck


const attendanceService = require("../../services/attendance/attendanceService");
const { sendSuccess, sendError, sendBadRequest } = require("../../utils/responseHandler");


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
    const summary = await attendanceService.getTodaySummary();
    return sendSuccess(res, summary);
  } catch (error) {
    return sendError(res, "Error fetching today's summary", 500, error.message);
  }
};

const markAttendance = async (req, res) => {
  try {
    const record = await attendanceService.markAttendance(req.body);
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
    const { result, message } = await attendanceService.markBulkAttendance(req.body);
    return sendSuccess(res, result, message, 201);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.message);
  }
};

const updateAttendance = async (req, res) => {
  try {
    const record = await attendanceService.updateAttendance(req.params.id, req.body);
    return sendSuccess(res, record, "Attendance updated successfully");
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.message);
  }
};

const deleteAttendance = async (req, res) => {
  try {
    await attendanceService.deleteAttendance(req.params.id);
    return sendSuccess(res, {}, "Attendance record deleted successfully");
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500, error.message);
  }
};

const getEmployeeMonthlyReport = async (req, res) => {
  try {
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
  getAttendance,
  getTodaySummary,
  markAttendance,
  markBulkAttendance,
  updateAttendance,
  deleteAttendance,
  getEmployeeMonthlyReport,
};