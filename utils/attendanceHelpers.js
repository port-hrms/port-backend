// @ts-nocheck
// server/utils/attendanceHelpers.js

const { toMinutes, normalizeTime12 } = require("./attendanceTime");

// Hours between two clock times on the same day ("10:05 AM" → "6:30 PM" = 8.42).
// Uses the clock times only, so the server's own timezone never matters.
// Returns 0 when either time is missing or check-out is not after check-in.
const calculateHours = (checkIn, checkOut) => {
  const inMin = toMinutes(normalizeTime12(checkIn));
  const outMin = toMinutes(normalizeTime12(checkOut));
  if (inMin === null || outMin === null || outMin <= inMin) return 0;
  return parseFloat(((outMin - inMin) / 60).toFixed(2));
};

// Throws a 400 when the pair of times can't be right.
const assertValidTimes = (checkIn, checkOut) => {
  const bad = (message) => { const e = new Error(message); e.statusCode = 400; throw e; };
  if (checkIn === null) bad("Check-in time isn't a valid time");
  if (checkOut === null) bad("Check-out time isn't a valid time");
  if (checkOut && !checkIn) bad("Add a check-in time before the check-out time");
  if (checkIn && checkOut && toMinutes(checkOut) <= toMinutes(checkIn)) bad("Check-out must be later than check-in");
};

const buildDateRangeForDay = (dateStr) => {
  const cleanDateStr = typeof dateStr === "string" && dateStr.includes("T")
    ? dateStr.split("T")[0]
    : String(dateStr);
  const start = new Date(`${cleanDateStr}T00:00:00.000Z`);
  const end = new Date(`${cleanDateStr}T23:59:59.999Z`);
  return { $gte: start, $lte: end };
};

// Whole calendar month. Dates are stored as UTC midnight of the IST day,
// so UTC boundaries are exact whatever the server's timezone.
const buildDateRangeForMonth = (month, year) => {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end   = new Date(Date.UTC(year, month, 1) - 1);
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

module.exports = {
  assertValidTimes, calculateDistance, calculateHours, buildDateRangeForDay, buildDateRangeForMonth, summariseRecords };