// @ts-nocheck
const Holiday = require("../models/Holiday");
const { parseIST, parseDateRange, IST_OFFSET } = require("../utils/dateHelper");

const withStatus = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// ─── Create a new holiday ───────────────────────────────────
const createHoliday = async (holidayData, userId) => {
  try {
    // Convert date strings (YYYY-MM-DD) to proper Date objects
    const processedData = {
      ...holidayData,
      createdBy: userId,
    };

    if (typeof holidayData.date === "string") {
      processedData.date = parseIST(holidayData.date);
    }

    if (holidayData.endDate && typeof holidayData.endDate === "string") {
      processedData.endDate = parseIST(holidayData.endDate);
    }

    const holiday = await Holiday.create(processedData);
    await holiday.populate("createdBy", "name email");
    return holiday;
  } catch (error) {
    throw withStatus(error.message || "Failed to create holiday", 400);
  }
};

// ─── Get all holidays ───────────────────────────────────────
const getAllHolidays = async (filters = {}) => {
  try {
    const query = {};

    // Filter by year if provided
    if (filters.year) {
      const startDate = new Date(`${filters.year}-01-01`);
      const endDate = new Date(`${filters.year}-12-31`);
      query.date = { $gte: startDate, $lte: endDate };
    }

    // Filter by type if provided
    if (filters.type) {
      query.type = filters.type;
    }

    // Filter by approval status if provided
    if (filters.isApproved !== undefined) {
      query.isApproved = filters.isApproved;
    }

    const holidays = await Holiday.find(query)
      .populate("createdBy", "name email")
      .sort({ date: 1 });

    return holidays;
  } catch (error) {
    throw withStatus(error.message || "Failed to fetch holidays", 500);
  }
};

// ─── Get holidays by date range ─────────────────────────────
const getHolidaysByDateRange = async (startDate, endDate) => {
  try {
    // If dates are strings, convert them using IST helper
    let start = startDate;
    let end = endDate;

    if (typeof startDate === "string") {
      start = parseIST(startDate);
    }
    if (typeof endDate === "string") {
      const dayEnd = parseIST(endDate);
      end = new Date(dayEnd);
      end.setDate(end.getDate() + 1); // Include entire last day
    }

    const holidays = await Holiday.find({
      $or: [
        { date: { $gte: start, $lte: end } },
        {
          endDate: {
            $exists: true,
            $gte: start,
            $lte: end,
          },
        },
      ],
    })
      .populate("createdBy", "name email")
      .sort({ date: 1 });

    return holidays;
  } catch (error) {
    throw withStatus(
      error.message || "Failed to fetch holidays by date range",
      500
    );
  }
};

// ─── Get holiday by ID ──────────────────────────────────────
const getHolidayById = async (holidayId) => {
  try {
    const holiday = await Holiday.findById(holidayId).populate("createdBy", "name email");

    if (!holiday) {
      throw withStatus("Holiday not found", 404);
    }

    return holiday;
  } catch (error) {
    throw withStatus(error.message || "Failed to fetch holiday", 404);
  }
};

// ─── Update a holiday ───────────────────────────────────────
const updateHoliday = async (holidayId, updateData) => {
  try {
    // Don't allow updating createdBy
    delete updateData.createdBy;

    // Convert date strings to proper Date objects
    const processedData = { ...updateData };

    if (updateData.date && typeof updateData.date === "string") {
      processedData.date = parseIST(updateData.date);
    }

    if (updateData.endDate && typeof updateData.endDate === "string") {
      processedData.endDate = parseIST(updateData.endDate);
    }

    const holiday = await Holiday.findByIdAndUpdate(holidayId, processedData, {
      new: true,
      runValidators: true,
    }).populate("createdBy", "name email");

    if (!holiday) {
      throw withStatus("Holiday not found", 404);
    }

    return holiday;
  } catch (error) {
    throw withStatus(error.message || "Failed to update holiday", 400);
  }
};

// ─── Delete a holiday ───────────────────────────────────────
const deleteHoliday = async (holidayId) => {
  try {
    const holiday = await Holiday.findByIdAndDelete(holidayId);

    if (!holiday) {
      throw withStatus("Holiday not found", 404);
    }

    return { message: "Holiday deleted successfully", deletedHoliday: holiday };
  } catch (error) {
    throw withStatus(error.message || "Failed to delete holiday", 400);
  }
};

// ─── Approve/Unapprove a holiday ────────────────────────────
const toggleHolidayApproval = async (holidayId, isApproved) => {
  try {
    const holiday = await Holiday.findByIdAndUpdate(
      holidayId,
      { isApproved },
      { new: true, runValidators: true }
    ).populate("createdBy", "name email");

    if (!holiday) {
      throw withStatus("Holiday not found", 404);
    }

    return holiday;
  } catch (error) {
    throw withStatus(error.message || "Failed to update holiday approval", 400);
  }
};

// ─── Get holidays for calendar view ─────────────────────────
const getCalendarHolidays = async (year, month, filters = {}) => {
  try {
    // Create proper IST dates for calendar month
    // month is 0-indexed (0 = January)
    const monthStr = String(month + 1).padStart(2, "0");
    const startDateStr = `${year}-${monthStr}-01`;
    const startDate = parseIST(startDateStr);

    // Get last day of month
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDateStr = `${year}-${monthStr}-${lastDay}`;
    const endDate = parseIST(endDateStr);
    const endOfDay = new Date(endDate);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const query = {
      $or: [
        { date: { $gte: startDate, $lte: endOfDay } },
        {
          endDate: {
            $exists: true,
            $gte: startDate,
          },
        },
      ],
      isApproved: filters.isApproved !== false ? true : undefined,
    };

    // Remove undefined values from query
    Object.keys(query).forEach((key) => query[key] === undefined && delete query[key]);

    const holidays = await Holiday.find(query)
      .populate("createdBy", "name email")
      .sort({ date: 1 });

    return holidays;
  } catch (error) {
    throw withStatus(error.message || "Failed to fetch calendar holidays", 500);
  }
};

module.exports = {
  createHoliday,
  getAllHolidays,
  getHolidaysByDateRange,
  getHolidayById,
  updateHoliday,
  deleteHoliday,
  toggleHolidayApproval,
  getCalendarHolidays,
};
