// Handle dates properly for IST timezone (UTC+5:30)
// This prevents date shifting issues when dates cross timezone boundaries

const IST_OFFSET = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30

/**
 * Convert a date string (YYYY-MM-DD) to a Date object at midnight IST
 * @param {string} dateString - Date string in format YYYY-MM-DD
 * @returns {Date} Date object at midnight IST
 */
const parseIST = (dateString) => {
  if (!dateString) return null;

  // Parse the date string (YYYY-MM-DD format)
  const [year, month, day] = dateString.split("-");
  
  // Create date at midnight UTC
  const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  
  // Return as-is (MongoDB will store this UTC time)
  // When retrieved, it will represent the same calendar date in IST
  return utcDate;
};

/**
 * Format a Date object to YYYY-MM-DD string
 * @param {Date} date - Date object
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
const formatToIST = (date) => {
  if (!date) return null;

  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();

  return `${year}-${month}-${day}`;
};

/**
 * Get start of day in UTC (representing IST midnight)
 * @param {string|Date} date - Date string (YYYY-MM-DD) or Date object
 * @returns {Date} Midnight UTC time
 */
const getStartOfDay = (date) => {
  const dateStr = typeof date === "string" ? date : formatToIST(date);
  return parseIST(dateStr);
};

/**
 * Get end of day in UTC (23:59:59)
 * @param {string|Date} date - Date string (YYYY-MM-DD) or Date object
 * @returns {Date} End of day UTC time
 */
const getEndOfDay = (date) => {
  const dateStr = typeof date === "string" ? date : formatToIST(date);
  const startDay = parseIST(dateStr);
  const endDay = new Date(startDay);
  endDay.setDate(endDay.getDate() + 1);
  endDay.setMilliseconds(-1);
  return endDay;
};

/**
 * Parse a date range with proper IST handling
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Object} {startDate: Date, endDate: Date}
 */
const parseDateRange = (startDate, endDate) => {
  return {
    startDate: getStartOfDay(startDate),
    endDate: getEndOfDay(endDate),
  };
};

module.exports = {
  parseIST,
  formatToIST,
  getStartOfDay,
  getEndOfDay,
  parseDateRange,
  IST_OFFSET,
};
