// @ts-nocheck
// ─────────────────────────────────────────────────────────────
// Attendance rules — the ONE place shift timings live.
// The client reads these from GET /api/attendance/policy.
// Times are stored as IST clock times like "10:05 AM".
// ─────────────────────────────────────────────────────────────

const TIME_ZONE = "Asia/Kolkata";
const SHIFT_START = "10:00 AM";
const SHIFT_END = "5:30 PM";
const LATE_GRACE_MINUTES = 30;          // check-in after 10:30 AM → Late
const HALF_DAY_CHECKIN_AFTER = "1:00 PM"; // check-in at/after 1:00 PM → Half Day
const HALF_DAY_HOURS = 4;               // fewer hours than this at check-out → Half Day
const WEEKLY_OFF_DAYS = [0];            // 0 = Sunday

const toMinutes = (timeStr) => {
  if (!timeStr) return null;
  const clean = String(timeStr).trim();
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = Number(match12[1]);
    const minutes = Number(match12[2]);
    const meridian = match12[3].toUpperCase();
    if (hours < 1 || hours > 12 || minutes > 59) return null;
    if (meridian === "PM" && hours !== 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }
  const match24 = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    const hours = Number(match24[1]);
    const minutes = Number(match24[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  }
  return null;
};

const formatTime12 = (date) => {
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIME_ZONE, // IST (UTC+5:30)
  }).toUpperCase();
};

/** Today's date in IST as "YYYY-MM-DD" (server clocks are UTC on Render). */
const todayIST = () => new Date().toLocaleDateString("en-CA", { timeZone: TIME_ZONE });

/** Is "YYYY-MM-DD" a weekly off day? */
const isWeeklyOff = (dateStr) => WEEKLY_OFF_DAYS.includes(new Date(`${dateStr}T12:00:00Z`).getUTCDay());

const resolveCheckInStatus = (checkIn) => {
  const checkInMinutes = toMinutes(checkIn);
  const shiftStartMinutes = toMinutes(SHIFT_START);
  if (checkInMinutes === null || shiftStartMinutes === null) return "Present";
  if (checkInMinutes >= toMinutes(HALF_DAY_CHECKIN_AFTER)) return "Half Day";
  return checkInMinutes > shiftStartMinutes + LATE_GRACE_MINUTES ? "Late" : "Present";
};

/**
 * Normalise any accepted time input to "h:mm AM/PM" (IST):
 *  "18:30" / "6:30 pm" / "06:30 PM" / an ISO timestamp → "6:30 PM".
 * Returns "" for empty input and null for anything unreadable.
 */
const normalizeTime12 = (timeStr) => {
  if (timeStr === undefined || timeStr === null || timeStr === "") return "";
  const clean = String(timeStr).trim();

  // Full timestamps (e.g. "2026-10-24T13:00:00.000Z") → IST clock time
  if (/^\d{4}-\d{2}-\d{2}T/.test(clean)) {
    const d = new Date(clean);
    return Number.isNaN(d.getTime()) ? null : formatTime12(d);
  }

  const mins = toMinutes(clean);
  if (mins === null) return null;
  let hours = Math.floor(mins / 60);
  const minutes = String(mins % 60).padStart(2, "0");
  const meridian = hours >= 12 ? "PM" : "AM";
  hours %= 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${meridian}`;
};

const canCheckIn = (checkIn) => {
  const checkInMinutes = toMinutes(checkIn);
  const shiftStartMinutes = toMinutes(SHIFT_START);
  if (checkInMinutes === null || shiftStartMinutes === null) return true;
  return checkInMinutes >= shiftStartMinutes;
};

/** Rules sent to the client so screens never hard-code them. */
const getAttendancePolicy = () => ({
  timeZone: TIME_ZONE,
  shiftStart: SHIFT_START,
  shiftEnd: SHIFT_END,
  shiftMinutes: toMinutes(SHIFT_END) - toMinutes(SHIFT_START),
  lateGraceMinutes: LATE_GRACE_MINUTES,
  lateAfter: normalizeTime12(`${Math.floor((toMinutes(SHIFT_START) + LATE_GRACE_MINUTES) / 60)}:${String((toMinutes(SHIFT_START) + LATE_GRACE_MINUTES) % 60).padStart(2, "0")}`),
  halfDayCheckInAfter: HALF_DAY_CHECKIN_AFTER,
  halfDayHours: HALF_DAY_HOURS,
  weeklyOffDays: WEEKLY_OFF_DAYS,
});

module.exports = {
  TIME_ZONE,
  SHIFT_START,
  SHIFT_END,
  LATE_GRACE_MINUTES,
  HALF_DAY_CHECKIN_AFTER,
  HALF_DAY_HOURS,
  WEEKLY_OFF_DAYS,
  toMinutes,
  formatTime12,
  todayIST,
  isWeeklyOff,
  resolveCheckInStatus,
  normalizeTime12,
  canCheckIn,
  getAttendancePolicy,
};
