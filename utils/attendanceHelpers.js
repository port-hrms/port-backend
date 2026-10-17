// @ts-nocheck
// server/utils/attendanceHelpers.js

const calculateHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;

  const parseTime = (time) => {
    // If it's a full ISO string, parse it directly
    if (typeof time === 'string' && time.includes('T')) {
      return new Date(time);
    }
    
    // Otherwise, assume it's a time string like "6:42 AM"
    // and anchor it to today's date for consistent calculation.
    const today = new Date();
    const [timePart, period] = String(time).split(' ');
    const [hours, minutes] = timePart.split(':');

    let h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);

    if (period && period.toUpperCase() === 'PM' && h < 12) {
      h += 12;
    }
    if (period && period.toUpperCase() === 'AM' && h === 12) {
      h = 0; // Midnight case
    }
    
    today.setHours(h, m, 0, 0);
    return today;
  };

  try {
    const dateIn = parseTime(checkIn);
    const dateOut = parseTime(checkOut);

    if (isNaN(dateIn.getTime()) || isNaN(dateOut.getTime())) {
      return 0;
    }

    // Handle night shifts where checkout is on the next day
    if (dateOut < dateIn) {
      dateOut.setDate(dateOut.getDate() + 1);
    }

    const diffMs = dateOut.getTime() - dateIn.getTime();
    if (diffMs < 0) return 0;

    const diffHours = diffMs / (1000 * 60 * 60);
    return parseFloat(diffHours.toFixed(2));
  } catch (error) {
    return 0;
  }
};

const buildDateRangeForDay = (dateStr) => {
  const cleanDateStr = typeof dateStr === "string" && dateStr.includes("T")
    ? dateStr.split("T")[0]
    : String(dateStr);
  const start = new Date(`${cleanDateStr}T00:00:00.000Z`);
  const end = new Date(`${cleanDateStr}T23:59:59.999Z`);
  return { $gte: start, $lte: end };
};

const buildDateRangeForMonth = (month, year) => {
  const start = new Date(year, month - 1, 1);
  const end   = new Date(year, month, 0, 23, 59, 59);
  return { $gte: start, $lte: end };
};


const summariseRecords = (records) => ({
  totalDays:  records.length,
  present:    records.filter((r) => r.status === "Present").length,
  absent:     records.filter((r) => r.status === "Absent").length,
  late:       records.filter((r) => r.status === "Late").length,
  halfDay:    records.filter((r) => r.status === "Half Day").length,
  onLeave:    records.filter((r) => r.status === "On Leave").length,
  totalHours: parseFloat(
    records.reduce((sum, r) => sum + (r.hoursWorked || 0), 0).toFixed(1)
  ),
});

// Haversine formula to calculate the distance between two coordinate points in meters
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const toRadians = (deg) => deg * (Math.PI / 180);

  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // returns distance in meters
};

module.exports = { calculateDistance, calculateHours, buildDateRangeForDay, buildDateRangeForMonth, summariseRecords };