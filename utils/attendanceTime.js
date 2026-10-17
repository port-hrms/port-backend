// @ts-nocheck

const SHIFT_START = "10:00 AM";
const LATE_GRACE_MINUTES = 30;
const HALF_DAY_HOURS = 4;

const toMinutes = (timeStr) => {
  if (!timeStr) return null;
  const clean = String(timeStr).trim();
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = Number(match12[1]);
    const minutes = Number(match12[2]);
    const meridian = match12[3].toUpperCase();
    if (meridian === "PM" && hours !== 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = Number(match24[1]);
    const minutes = Number(match24[2]);
    return hours * 60 + minutes;
  }
  return null;
};

const formatTime12 = (date) => {
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata", // IST (UTC+5:30)
  });
};

const resolveCheckInStatus = (checkIn) => {
  const checkInMinutes = toMinutes(checkIn);
  const shiftStartMinutes = toMinutes(SHIFT_START);
  if (checkInMinutes === null || shiftStartMinutes === null) return "Present";
  
  // After 1:00 PM (13:00 -> 780 minutes) is Half Day
  if (checkInMinutes >= 780) {
    return "Half Day";
  }
  
  return checkInMinutes > shiftStartMinutes + LATE_GRACE_MINUTES ? "Late" : "Present";
};

const normalizeTime12 = (timeStr) => {
  if (!timeStr) return "";
  const clean = String(timeStr).trim();
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = Number(match12[1]);
    const minutes = String(match12[2]).padStart(2, "0");
    const meridian = match12[3].toUpperCase();
    return `${hours}:${minutes} ${meridian}`;
  }
  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    let hours = Number(match24[1]);
    const minutes = String(match24[2]).padStart(2, "0");
    const meridian = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${hours}:${minutes} ${meridian}`;
  }
  return timeStr;
};

const canCheckIn = (checkIn) => {
  const checkInMinutes = toMinutes(checkIn);
  const shiftStartMinutes = toMinutes(SHIFT_START);
  if (checkInMinutes === null || shiftStartMinutes === null) return true;
  return checkInMinutes >= shiftStartMinutes;
};

module.exports = {
  SHIFT_START,
  LATE_GRACE_MINUTES,
  HALF_DAY_HOURS,
  formatTime12,
  resolveCheckInStatus,
  normalizeTime12,
  canCheckIn,
};
