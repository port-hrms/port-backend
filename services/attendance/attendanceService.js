// @ts-nocheck

const Attendance = require("../../models/Attendance");
const Employee   = require("../../models/Employee");
const Holiday    = require("../../models/Holiday");
const CompanySetting = require("../../models/CompanySetting");
const {
  calculateHours,
  calculateDistance,
  assertValidTimes,
  buildDateRangeForDay,
  buildDateRangeForMonth,
  summariseRecords,
} = require("../../utils/attendanceHelpers");
const { normalizeTime12, todayIST, isWeeklyOff } = require("../../utils/attendanceTime");

const WORKING_STATUSES = ["Present", "Late", "Half Day"];
const ALL_STATUSES = ["Present", "Absent", "On Leave", "Half Day", "Late"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TRACKED_FIELDS = ["status", "checkIn", "checkOut", "hoursWorked", "leaveType", "remarks"];
const MIN_REASON = 3;

const fail = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
};

// actor = { id, name } of the signed-in user making the change
const historyEntry = (actor, action, reason = "", changes = []) => ({
  at: new Date(),
  by: actor?.id || null,
  byName: actor?.name || "",
  action,
  reason,
  changes,
});

const diffFields = (before, after) => TRACKED_FIELDS
  .filter((f) => String(before[f] ?? "") !== String(after[f] ?? ""))
  .map((f) => ({ field: f, from: String(before[f] ?? ""), to: String(after[f] ?? "") }));

const requireReason = (reason, what) => {
  const r = typeof reason === "string" ? reason.trim() : "";
  if (r.length < MIN_REASON) fail(`Please give a reason for ${what}`);
  return r;
};

// Missed check-out: a past working day with a check-in and no check-out
const isMissedCheckOut = (r) => Boolean(
  r.missedCheckOut ||
  (WORKING_STATUSES.includes(r.status) && r.checkIn && !r.checkOut &&
    new Date(r.date).toISOString().slice(0, 10) < todayIST())
);

// Adds distance from the office (metres) for check-in / check-out locations
const withLocationInfo = (doc, office) => {
  const r = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  const dist = (loc) => (office && loc?.lat != null && loc?.lng != null
    ? Math.round(calculateDistance(Number(loc.lat), Number(loc.lng), office.lat, office.lng))
    : null);
  r.checkInDistance = dist(r.location);
  r.checkOutDistance = dist(r.checkOutLocation);
  r.officeRadius = office?.radius ?? null;
  r.missedCheckOut = isMissedCheckOut(r);
  r.edited = (r.history || []).some((h) => ["updated", "restored"].includes(h.action));
  return r;
};

const getOffice = async () => {
  const settings = await CompanySetting.findOne().select("latitude longitude radius").lean();
  if (settings?.latitude == null || settings?.longitude == null) return null;
  return { lat: Number(settings.latitude), lng: Number(settings.longitude), radius: Number(settings.radius) || 50 };
};

// Employees who should have attendance: not removed and not Inactive
const ACTIVE_EMPLOYEE_FILTER = { is_deleted: { $ne: true }, status: { $ne: "Inactive" } };

/** Returns the holiday covering "YYYY-MM-DD", if any. */
const findHoliday = (dateStr) => {
  const day = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);
  return Holiday.findOne({
    isApproved: { $ne: false },
    $or: [
      { date: { $gte: day, $lte: dayEnd } },
      { date: { $lte: dayEnd }, endDate: { $gte: day } },
    ],
  }).select("name");
};

/** Weekly off or holiday → no one is expected to work. */
const getOffDayInfo = async (dateStr) => {
  if (isWeeklyOff(dateStr)) return { isOffDay: true, offDayReason: "Weekly off (Sunday)" };
  const holiday = await findHoliday(dateStr);
  return holiday ? { isOffDay: true, offDayReason: `Holiday: ${holiday.name}` } : { isOffDay: false, offDayReason: "" };
};

/**
 * Records for a day (or month / employee). With includeUnmarked=true and a single date,
 * every active employee without a record is added as a "Not Marked" row (no _id).
 */
const getAttendance = async ({ date, employeeId, month, year, includeUnmarked }) => {
  const filter = {};

  if (date)          filter.date     = buildDateRangeForDay(date);
  if (month && year) filter.date     = buildDateRangeForMonth(parseInt(month), parseInt(year));
  if (employeeId)    filter.employee = employeeId;

  const [records, office] = await Promise.all([
    Attendance.find(filter)
      .populate("employee", "firstName lastName employeeId department designation avatar is_deleted")
      .sort({ date: -1 }),
    getOffice(),
  ]);

  // Hide records of removed employees from the daily register
  const visible = records
    .filter((r) => r.employee && !r.employee.is_deleted)
    .map((r) => withLocationInfo(r, office));

  if (!(date && String(includeUnmarked) === "true")) return visible;

  const markedIds = new Set(visible.map((r) => String(r.employee._id)));
  const employees = await Employee.find(ACTIVE_EMPLOYEE_FILTER)
    .select("firstName lastName employeeId department designation avatar")
    .sort({ firstName: 1, lastName: 1 });

  const unmarked = employees
    .filter((e) => !markedIds.has(String(e._id)))
    .map((e) => ({ _id: null, unmarked: true, employee: e, status: "Not Marked", checkIn: "", checkOut: "", hoursWorked: 0 }));

  return [...visible, ...unmarked];
};

/**
 * Attendance summary for one day (defaults to today in IST).
 * Counts only current employees, and tells the client how many have no record yet.
 */
const getDaySummary = async (dateInput) => {
  const dateStr = DATE_RE.test(String(dateInput || "")) ? String(dateInput) : todayIST();
  const isFuture = dateStr > todayIST();

  const [employees, records, offDay] = await Promise.all([
    Employee.find(ACTIVE_EMPLOYEE_FILTER).select("_id"),
    Attendance.find({ date: buildDateRangeForDay(dateStr) }).select("employee status checkIn checkOut missedCheckOut date"),
    getOffDayInfo(dateStr),
  ]);

  const activeIds = new Set(employees.map((e) => String(e._id)));
  const counted = records.filter((r) => activeIds.has(String(r.employee)));
  const count = (status) => counted.filter((r) => r.status === status).length;

  const present = count("Present");
  const late = count("Late");
  const halfDay = count("Half Day");
  const totalEmployees = activeIds.size;
  const expectToWork = !offDay.isOffDay && !isFuture;
  const attended = present + late + halfDay;

  return {
    date: dateStr,
    present,
    absent: count("Absent"),
    onLeave: count("On Leave"),
    halfDay,
    late,
    notMarked: expectToWork ? Math.max(totalEmployees - counted.length, 0) : 0,
    missedCheckOut: counted.filter(isMissedCheckOut).length,
    totalEmployees,
    ...offDay,
    isFuture,
    // Anyone who came in (present, late or half day) out of everyone employed
    attendanceRate: expectToWork && totalEmployees > 0
      ? ((attended / totalEmployees) * 100).toFixed(1)
      : 0,
  };
};

// Backwards-compatible name used by the controller
const getTodaySummary = (date) => getDaySummary(date);

/** Clean + validate the editable fields for a given status. Returns the fields to save. */
const buildRecordFields = ({ status, checkIn, checkOut, leaveType, remarks }) => {
  if (!ALL_STATUSES.includes(status)) fail(`Status must be one of: ${ALL_STATUSES.join(", ")}`);

  const fields = { status, remarks: typeof remarks === "string" ? remarks.trim() : "" };

  if (WORKING_STATUSES.includes(status)) {
    const inTime = normalizeTime12(checkIn);
    const outTime = normalizeTime12(checkOut);
    assertValidTimes(inTime, outTime);
    fields.checkIn = inTime || "";
    fields.checkOut = outTime || "";
    fields.hoursWorked = inTime && outTime ? calculateHours(inTime, outTime) : 0;
    fields.leaveType = "";
    if (outTime) fields.missedCheckOut = false;
  } else {
    // Absent / On Leave: no times or hours
    fields.checkIn = "";
    fields.checkOut = "";
    fields.hoursWorked = 0;
    fields.leaveType = status === "On Leave" ? leaveType || "" : "";
    fields.missedCheckOut = false;
  }
  return fields;
};

// Mark attendance for a single employee
const markAttendance = async (body, actor) => {
  const { employee, date, status } = body;

  if (!employee || !date || !status) fail("Employee, date and status are required");
  if (!DATE_RE.test(String(date))) fail("Date must be YYYY-MM-DD");
  if (date > todayIST()) fail("You can't mark attendance for a future date");

  const employeeDoc = await Employee.findOne({ _id: employee, is_deleted: { $ne: true } }).select("status");
  if (!employeeDoc) fail("Employee not found", 404);
  if (employeeDoc.status === "Inactive") fail("This employee is inactive");

  const existing = await Attendance.findOne({ employee, date: buildDateRangeForDay(date) }).select("_id");
  if (existing) fail("Attendance is already marked for this employee on this date. Edit that record instead.");

  const fields = buildRecordFields(body);
  const record = await Attendance.create({
    employee,
    date: new Date(`${date}T00:00:00.000Z`),
    ...fields,
    source: "admin",
    history: [historyEntry(actor, "created", (body.reason || "").trim() || "Marked manually by admin",
      diffFields({}, fields))],
  });

  await record.populate("employee", "firstName lastName employeeId department designation avatar");
  return record;
};

// Bulk mark attendance — skips employees already marked
const markBulkAttendance = async ({ date, records, reason }, actor) => {
  if (!date || !records?.length) fail("Date and records array are required");
  if (!DATE_RE.test(String(date))) fail("Date must be YYYY-MM-DD");
  if (date > todayIST()) fail("You can't mark attendance for a future date");

  const dateRange = buildDateRangeForDay(date);

  const existing = await Attendance.find({
    date:     dateRange,
    employee: { $in: records.map((r) => r.employee) },
  }).select("employee");

  const alreadyMarked = new Set(existing.map((r) => r.employee.toString()));

  const newRecords = records
    .filter((r) => !alreadyMarked.has(String(r.employee)))
    .map((r) => {
      const fields = buildRecordFields({ ...r, status: r.status || "Present" });
      return {
        employee: r.employee,
        date: new Date(`${date}T00:00:00.000Z`),
        ...fields,
        source: "admin",
        history: [historyEntry(actor, "created", (reason || "").trim() || "Marked in bulk by admin", diffFields({}, fields))],
      };
    });

  if (newRecords.length === 0) {
    return {
      result: [],
      message: records.length === 1
        ? "This employee already has attendance marked for this date"
        : `All ${records.length} employees already have attendance marked for this date`,
    };
  }

  const result  = await Attendance.insertMany(newRecords);
  const skipped = records.length - newRecords.length;

  return {
    result,
    message: skipped > 0
      ? `${result.length} marked, ${skipped} already had attendance`
      : `${result.length} employee${result.length === 1 ? "" : "s"} marked`,
  };
};

// Update an attendance record. Fields present in the body are applied exactly —
// an empty value clears it (e.g. removing a wrong check-out).
const updateAttendance = async (id, body = {}, actor) => {
  const record = await Attendance.findById(id);
  if (!record) fail("Attendance record not found", 404);
  const reason = requireReason(body.reason, "this change");

  const has = (k) => Object.prototype.hasOwnProperty.call(body, k);
  const merged = {
    status:    has("status")    ? body.status    : record.status,
    checkIn:   has("checkIn")   ? body.checkIn   : record.checkIn,
    checkOut:  has("checkOut")  ? body.checkOut  : record.checkOut,
    leaveType: has("leaveType") ? body.leaveType : record.leaveType,
    remarks:   has("remarks")   ? body.remarks   : record.remarks,
  };

  const before = record.toObject();
  const fields = buildRecordFields(merged);
  const changes = diffFields(before, fields);
  if (changes.length === 0) fail("Nothing was changed");

  Object.assign(record, fields);
  record.history.push(historyEntry(actor, "updated", reason, changes));
  await record.save();
  await record.populate("employee", "firstName lastName employeeId department designation avatar");
  return record;
};

// Soft delete: hidden everywhere, kept with who / when / why
const deleteAttendance = async (id, body = {}, actor) => {
  const record = await Attendance.findById(id);
  if (!record) fail("Attendance record not found", 404);
  const reason = requireReason(body.reason, "deleting this record");

  record.isDeleted = true;
  record.deletedAt = new Date();
  record.deletedBy = actor?.id || null;
  record.deleteReason = reason;
  record.history.push(historyEntry(actor, "deleted", reason));
  await record.save();
};

// Deleted records for a day (for the "Show deleted" view)
const getDeletedAttendance = async ({ date }) => {
  if (!DATE_RE.test(String(date || ""))) fail("Date must be YYYY-MM-DD");
  const records = await Attendance.find({ date: buildDateRangeForDay(date), isDeleted: true })
    .setOptions({ withDeleted: true })
    .populate("employee", "firstName lastName employeeId department designation avatar")
    .populate("deletedBy", "name")
    .sort({ deletedAt: -1 });
  return records.filter((r) => r.employee);
};

const restoreAttendance = async (id, body = {}, actor) => {
  const record = await Attendance.findOne({ _id: id, isDeleted: true }).setOptions({ withDeleted: true });
  if (!record) fail("Deleted record not found", 404);

  const live = await Attendance.findOne({ employee: record.employee, date: record.date }).select("_id");
  if (live) fail("This employee already has a record for that day. Delete or edit that one instead.");

  record.isDeleted = false;
  record.deletedAt = null;
  record.deletedBy = null;
  record.deleteReason = "";
  record.history.push(historyEntry(actor, "restored", (body.reason || "").trim() || "Restored by admin"));
  await record.save();
  await record.populate("employee", "firstName lastName employeeId department designation avatar");
  return record;
};

// Full change history of one record (including deleted ones)
const getAttendanceHistory = async (id) => {
  const record = await Attendance.findById(id)
    .setOptions({ withDeleted: true })
    .select("employee date status source history isDeleted createdAt")
    .populate("employee", "firstName lastName employeeId")
    .populate("history.by", "name");
  if (!record) fail("Attendance record not found", 404);
  return record;
};

/**
 * Monthly register: every employee × every day of the month, with off days and totals.
 * Includes current employees plus anyone (not removed) who has records that month.
 */
const getMonthlyRegister = async ({ month, year, department }) => {
  const [ty, tm] = todayIST().split("-").map(Number);
  const m = parseInt(month) || tm;
  const y = parseInt(year) || ty;
  if (m < 1 || m > 12) fail("Month must be 1–12");

  const range = buildDateRangeForMonth(m, y);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const pad = (n) => String(n).padStart(2, "0");
  const today = todayIST();

  const [records, holidays] = await Promise.all([
    Attendance.find({ date: range }).select("employee date status hoursWorked workMode missedCheckOut checkIn checkOut"),
    Holiday.find({
      isApproved: { $ne: false },
      date: { $lte: range.$lte },
      $or: [{ endDate: null }, { endDate: { $gte: range.$gte } }, { date: { $gte: range.$gte } }],
    }).select("name date endDate"),
  ]);

  const holidayOn = (dayStr) => holidays.find((h) => {
    const from = new Date(h.date).toISOString().slice(0, 10);
    const to = h.endDate ? new Date(h.endDate).toISOString().slice(0, 10) : from;
    return dayStr >= from && dayStr <= to;
  });

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = `${y}-${pad(m)}-${pad(i + 1)}`;
    const holiday = holidayOn(date);
    return {
      date,
      day: i + 1,
      weekday: new Date(`${date}T12:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }),
      isOffDay: isWeeklyOff(date) || Boolean(holiday),
      offDayReason: isWeeklyOff(date) ? "Weekly off" : holiday ? holiday.name : "",
      isFuture: date > today,
    };
  });

  const recordEmployeeIds = [...new Set(records.map((r) => String(r.employee)))];
  const empFilter = {
    is_deleted: { $ne: true },
    $or: [{ status: { $ne: "Inactive" } }, { _id: { $in: recordEmployeeIds } }],
  };
  if (department && department !== "All") empFilter.department = department;
  const employees = await Employee.find(empFilter)
    .select("firstName lastName employeeId department designation avatar status")
    .sort({ firstName: 1, lastName: 1 });

  const byEmployee = new Map();
  records.forEach((r) => {
    const key = String(r.employee);
    if (!byEmployee.has(key)) byEmployee.set(key, {});
    byEmployee.get(key)[new Date(r.date).toISOString().slice(0, 10)] = {
      status: r.status,
      hours: r.hoursWorked || 0,
      wfh: r.workMode === "WFH",
      missedCheckOut: isMissedCheckOut(r),
    };
  });

  const workingDays = days.filter((d) => !d.isOffDay).length;
  const rows = employees.map((e) => {
    const cells = byEmployee.get(String(e._id)) || {};
    const list = Object.values(cells);
    const count = (st) => list.filter((c) => c.status === st).length;
    const expectedSoFar = days.filter((d) => !d.isOffDay && !d.isFuture).length;
    return {
      _id: e._id,
      name: `${e.firstName} ${e.lastName}`.trim(),
      firstName: e.firstName,
      lastName: e.lastName,
      employeeId: e.employeeId,
      department: e.department,
      designation: e.designation,
      avatar: e.avatar,
      cells,
      totals: {
        present: count("Present"),
        late: count("Late"),
        halfDay: count("Half Day"),
        absent: count("Absent"),
        onLeave: count("On Leave"),
        wfh: list.filter((c) => c.wfh).length,
        missedCheckOut: list.filter((c) => c.missedCheckOut).length,
        notMarked: Math.max(expectedSoFar - days.filter((d) => !d.isOffDay && !d.isFuture && cells[d.date]).length, 0),
        hours: Math.round(list.reduce((s, c) => s + c.hours, 0) * 10) / 10,
      },
    };
  });

  return { month: m, year: y, workingDays, days, employees: rows };
};

// Get monthly report for one employee (month/year default to the current IST month)
const getEmployeeMonthlyReport = async (employeeId, { month, year }) => {
  const [ty, tm] = todayIST().split("-").map(Number);
  const m = parseInt(month) || tm;
  const y = parseInt(year)  || ty;

  const records = await Attendance.find({
    employee: employeeId,
    date:     buildDateRangeForMonth(m, y),
  }).sort({ date: 1 });

  return {
    records,
    summary: summariseRecords(records),
  };
};

module.exports = {
  getAttendance,
  getTodaySummary,
  getDaySummary,
  markAttendance,
  markBulkAttendance,
  updateAttendance,
  deleteAttendance,
  getDeletedAttendance,
  restoreAttendance,
  getAttendanceHistory,
  getEmployeeMonthlyReport,
  getMonthlyRegister,
};
