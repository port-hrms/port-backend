// @ts-nocheck

const { ALLOWED_UPDATE_STATUSES } = require("../utils/leaveHelpers");

const validateCreateLeaveInput = (req, res, next) => {
  const { employee, leaveType, startDate, endDate, numberOfDays, reason } = req.body;

  if (!employee || !leaveType || !startDate || !endDate || !numberOfDays || !reason) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  next();
};

const validateEmployeeIdQuery = (req, res, next) => {
  const { employeeId } = req.query;
  if (!employeeId) {
    return res.status(400).json({ success: false, message: "Employee ID is required" });
  }
  next();
};

const validateUpdateLeaveStatusInput = (req, res, next) => {
  const { status } = req.body;

  if (!status || !ALLOWED_UPDATE_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  next();
};

module.exports = {
  validateCreateLeaveInput,
  validateEmployeeIdQuery,
  validateUpdateLeaveStatusInput,
};
