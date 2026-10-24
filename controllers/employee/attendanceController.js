// @ts-nocheck

const attendanceEmployeeService = require("../../services/attendance/attendanceEmployeeService");
const { sendSuccess, sendError, sendBadRequest } = require("../../utils/responseHandler");

const checkIn = async (req, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body || {};
    const record = await attendanceEmployeeService.employeeCheckIn(req.user?._id, { latitude, longitude, accuracy });
    return sendSuccess(res, record, "Checked in successfully", 201);
  } catch (error) {
    if (error.statusCode === 400) {
      return sendBadRequest(res, error.message);
    }
    return sendError(res, error.message, error.statusCode || 500, error.message);
  }
};

const checkOut = async (req, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body || {};
    const record = await attendanceEmployeeService.employeeCheckOut(req.user?._id, { latitude, longitude, accuracy });
    return sendSuccess(res, record, "Checked out successfully");
  } catch (error) {
    if (error.statusCode === 400) {
      return sendBadRequest(res, error.message);
    }
    return sendError(res, error.message, error.statusCode || 500, error.message);
  }
};

module.exports = {
  checkIn,
  checkOut,
};
