// @ts-nocheck

const { parseInteger } = require("../utils/performanceHelpers");

const validateCreateReviewInput = (req, res, next) => {
  const { employee, reviewCycle, year } = req.body;

  if (!employee || !reviewCycle || !year) {
    return res.status(400).json({
      success: false,
      message: "Employee, review cycle and year are required",
    });
  }

  const parsedYear = parseInteger(year);
  if (!parsedYear || parsedYear < 1900) {
    return res.status(400).json({
      success: false,
      message: "Invalid year",
    });
  }

  next();
};

module.exports = {
  validateCreateReviewInput,
};
