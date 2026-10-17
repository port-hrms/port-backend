// @ts-nocheck

const validateCreateHoliday = (req, res, next) => {
  const { name, date, type, description, endDate, color } = req.body;

  const errors = [];

  // Validate name
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    errors.push("Holiday name is required and must be a non-empty string");
  }

  // Validate date
  if (!date) {
    errors.push("Holiday date is required");
  } else {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      errors.push("Invalid date format. Use ISO 8601 format (YYYY-MM-DD)");
    }
  }

  // Validate type (optional, defaults to National)
  if (type && !["National", "Regional", "Religious", "Company", "Other"].includes(type)) {
    errors.push(`Holiday type must be one of: National, Regional, Religious, Company, Other`);
  }

  // Validate description (optional)
  if (description && typeof description !== "string") {
    errors.push("Description must be a string");
  }

  // Validate endDate if provided (for multi-day holidays)
  if (endDate) {
    const endDateObj = new Date(endDate);
    if (isNaN(endDateObj.getTime())) {
      errors.push("Invalid end date format. Use ISO 8601 format (YYYY-MM-DD)");
    } else if (date) {
      const startDateObj = new Date(date);
      if (endDateObj < startDateObj) {
        errors.push("End date must be after or equal to the start date");
      }
    }
  }

  // Validate color (optional, must be hex)
  if (color && typeof color === "string") {
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexColorRegex.test(color)) {
      errors.push("Color must be a valid hex color code (e.g., #FF6B6B)");
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  next();
};

const validateUpdateHoliday = (req, res, next) => {
  const { name, date, type, description, endDate, color, isApproved } = req.body;

  const errors = [];

  // Validate name if provided
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0) {
      errors.push("Holiday name must be a non-empty string");
    }
  }

  // Validate date if provided
  if (date !== undefined) {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      errors.push("Invalid date format. Use ISO 8601 format (YYYY-MM-DD)");
    }
  }

  // Validate type if provided
  if (type !== undefined) {
    if (!["National", "Regional", "Religious", "Company", "Other"].includes(type)) {
      errors.push(`Holiday type must be one of: National, Regional, Religious, Company, Other`);
    }
  }

  // Validate description if provided
  if (description !== undefined && typeof description !== "string") {
    errors.push("Description must be a string");
  }

  // Validate endDate if provided
  if (endDate !== undefined) {
    if (typeof endDate === "string") {
      const endDateObj = new Date(endDate);
      if (isNaN(endDateObj.getTime())) {
        errors.push("Invalid end date format. Use ISO 8601 format (YYYY-MM-DD)");
      }
    } else if (endDate !== null) {
      errors.push("End date must be a valid date string or null");
    }
  }

  // Validate color if provided
  if (color !== undefined && color !== null) {
    if (typeof color !== "string") {
      errors.push("Color must be a string");
    } else {
      const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!hexColorRegex.test(color)) {
        errors.push("Color must be a valid hex color code (e.g., #FF6B6B)");
      }
    }
  }

  // Validate isApproved if provided
  if (isApproved !== undefined && typeof isApproved !== "boolean") {
    errors.push("isApproved must be a boolean");
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  next();
};

const validateToggleApproval = (req, res, next) => {
  const { isApproved } = req.body;

  if (isApproved === undefined) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: ["isApproved field is required and must be a boolean"],
    });
  }

  if (typeof isApproved !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: ["isApproved must be a boolean"],
    });
  }

  next();
};

module.exports = {
  validateCreateHoliday,
  validateUpdateHoliday,
  validateToggleApproval,
};
