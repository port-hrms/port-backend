// @ts-nocheck

const { parseInteger } = require("../utils/payrollHelpers");

const validateGeneratePayrollInput = (req, res, next) => {
  const { employeeId, month, year, attendance, earnings, deductions, payment } = req.body;

  if (!employeeId || !month || !year) {
    return res.status(400).json({
      success: false,
      message: "Employee ID, month and year are required",
    });
  }

  const parsedMonth = parseInteger(month);
  const parsedYear = parseInteger(year);

  if (!parsedMonth || parsedMonth < 1 || parsedMonth > 12 || !parsedYear || parsedYear < 1900) {
    return res.status(400).json({
      success: false,
      message: "Invalid month or year",
    });
  }

  if (attendance || earnings || deductions || payment) {
    const hasAttendance = attendance && ["workingDays", "presentDays", "lopDays"].every((key) => attendance[key] !== undefined);
    const hasEarnings   = earnings   && ["basic", "hra", "bonus"].every((key) => earnings[key] !== undefined);

    if (!hasAttendance || !hasEarnings) {
      return res.status(400).json({
        success: false,
        message: "Invalid payroll payload — attendance (workingDays, presentDays, lopDays) and earnings (basic, hra, bonus) are required",
      });
    }
  }

  next();
};

const validateRunPayrollInput = (req, res, next) => {
  const { month, year } = req.body;

  if (!month || !year) {
    return res.status(400).json({
      success: false,
      message: "Month and year are required",
    });
  }

  const parsedMonth = parseInteger(month);
  const parsedYear = parseInteger(year);

  if (!parsedMonth || parsedMonth < 1 || parsedMonth > 12 || !parsedYear || parsedYear < 1900) {
    return res.status(400).json({
      success: false,
      message: "Invalid month or year",
    });
  }

  next();
};

module.exports = {
  validateGeneratePayrollInput,
  validateRunPayrollInput,
};
