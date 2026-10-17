// @ts-nocheck
const {
  createHoliday,
  getAllHolidays,
  getHolidaysByDateRange,
  getHolidayById,
  updateHoliday,
  deleteHoliday,
  toggleHolidayApproval,
  getCalendarHolidays,
} = require("../services/holidayService");

const resolveStatusCode = (error, fallback = 500) => error?.statusCode || fallback;

// ─── Create Holiday ─────────────────────────────────────────
const create = async (req, res) => {
  try {
    const holiday = await createHoliday(req.body, req.user.id);
    return res.status(201).json({
      success: true,
      message: "Holiday created successfully",
      data: holiday,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error, 400)).json({
      success: false,
      message: error.message || "Failed to create holiday",
      error: error.message,
    });
  }
};

// ─── Get All Holidays ───────────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { year, type, isApproved } = req.query;
    const filters = {};

    if (year) filters.year = parseInt(year);
    if (type) filters.type = type;
    if (isApproved !== undefined) filters.isApproved = isApproved === "true";

    const holidays = await getAllHolidays(filters);

    return res.status(200).json({
      success: true,
      message: "Holidays fetched successfully",
      count: holidays.length,
      data: holidays,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error, 500)).json({
      success: false,
      message: error.message || "Failed to fetch holidays",
      error: error.message,
    });
  }
};

// ─── Get Holidays by Date Range ─────────────────────────────
const getByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate query parameters are required",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use ISO 8601 format (YYYY-MM-DD)",
      });
    }

    const holidays = await getHolidaysByDateRange(start, end);

    return res.status(200).json({
      success: true,
      message: "Holidays fetched successfully",
      count: holidays.length,
      data: holidays,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error, 500)).json({
      success: false,
      message: error.message || "Failed to fetch holidays",
      error: error.message,
    });
  }
};

// ─── Get Holiday by ID ──────────────────────────────────────
const getById = async (req, res) => {
  try {
    const holiday = await getHolidayById(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Holiday fetched successfully",
      data: holiday,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error, 404)).json({
      success: false,
      message: error.message || "Failed to fetch holiday",
      error: error.message,
    });
  }
};

// ─── Update Holiday ─────────────────────────────────────────
const update = async (req, res) => {
  try {
    const holiday = await updateHoliday(req.params.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Holiday updated successfully",
      data: holiday,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error, 400)).json({
      success: false,
      message: error.message || "Failed to update holiday",
      error: error.message,
    });
  }
};

// ─── Delete Holiday ─────────────────────────────────────────
const remove = async (req, res) => {
  try {
    await deleteHoliday(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Holiday deleted successfully",
    });
  } catch (error) {
    return res.status(resolveStatusCode(error, 400)).json({
      success: false,
      message: error.message || "Failed to delete holiday",
      error: error.message,
    });
  }
};

// ─── Toggle Holiday Approval ────────────────────────────────
const toggleApproval = async (req, res) => {
  try {
    const { isApproved } = req.body;

    if (isApproved === undefined) {
      return res.status(400).json({
        success: false,
        message: "isApproved field is required",
      });
    }

    const holiday = await toggleHolidayApproval(req.params.id, isApproved);

    return res.status(200).json({
      success: true,
      message: `Holiday ${isApproved ? "approved" : "rejected"} successfully`,
      data: holiday,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error, 400)).json({
      success: false,
      message: error.message || "Failed to update holiday approval",
      error: error.message,
    });
  }
};

// ─── Get Calendar View Holidays ─────────────────────────────
const getCalendar = async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: "year and month query parameters are required",
      });
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month) - 1; // Convert to 0-indexed

    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 0 || monthNum > 11) {
      return res.status(400).json({
        success: false,
        message: "Invalid year or month format",
      });
    }

    const holidays = await getCalendarHolidays(yearNum, monthNum);

    return res.status(200).json({
      success: true,
      message: "Calendar holidays fetched successfully",
      data: holidays,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error, 500)).json({
      success: false,
      message: error.message || "Failed to fetch calendar holidays",
      error: error.message,
    });
  }
};

module.exports = {
  create,
  getAll,
  getByDateRange,
  getById,
  update,
  remove,
  toggleApproval,
  getCalendar,
};
