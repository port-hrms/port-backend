// @ts-nocheck

const Attendance = require("../../models/Attendance");
const User = require("../../models/User");
const Leave = require("../../models/Leave");
const CompanySetting = require("../../models/CompanySetting");
const wfhService = require("../wfhService");
const { calculateHours, buildDateRangeForDay, calculateDistance } = require("../../utils/attendanceHelpers");
const { formatTime12, resolveCheckInStatus, HALF_DAY_HOURS } = require("../../utils/attendanceTime");

const getUserEmployee = async (userId) => {
  const user = await User.findById(userId).populate("employee");
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  if (!user.employee) {
    const err = new Error("Employee profile not found");
    err.statusCode = 404;
    throw err;
  }
  return user.employee;
};

const employeeCheckIn = async (userId, coords) => {
  const employee = await getUserEmployee(userId);
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const isSunday = new Date(`${todayStr}T12:00:00Z`).getUTCDay() === 0;

  if (isSunday) {
    const err = new Error("Check-in is disabled on Sundays (Mon-Sat only)");
    err.statusCode = 400;
    throw err;
  }

  const todayRange = buildDateRangeForDay(todayStr);

  const startOfToday = new Date(`${todayStr}T00:00:00.000Z`);
  const endOfToday = new Date(`${todayStr}T23:59:59.999Z`);

  const approvedLeave = await Leave.findOne({
    employee: employee._id,
    status: "Approved",
    startDate: { $lte: endOfToday },
    endDate: { $gte: startOfToday }
  });

  if (approvedLeave) {
    const err = new Error("You have an approved leave for today and cannot check in");
    err.statusCode = 400;
    throw err;
  }

  let record = await Attendance.findOne({ employee: employee._id, date: todayRange });
  if (record?.status === "On Leave") {
    const err = new Error("You are marked on leave today");
    err.statusCode = 400;
    throw err;
  }
  if (record?.checkIn) {
    const err = new Error("Check-in already recorded");
    err.statusCode = 400;
    throw err;
  }

  // ── Check if today is an approved WFH day ──────────────────
  const wfhRecord = await wfhService.getTodayWFH(employee._id, todayStr);
  const isWFHDay = !!wfhRecord;

  if (!isWFHDay) {
    // ── Geofencing radius validation (office check-in only) ──
    if (!coords || coords.latitude === undefined || coords.longitude === undefined) {
      const err = new Error("Location coordinates are required to check-in");
      err.statusCode = 400;
      throw err;
    }

    const companySettings = await CompanySetting.findOne();
    if (companySettings && companySettings.latitude !== undefined && companySettings.longitude !== undefined) {
      const allowedRadius = Number(companySettings.radius) || 50;
      const distance = calculateDistance(
        Number(coords.latitude),
        Number(coords.longitude),
        Number(companySettings.latitude),
        Number(companySettings.longitude)
      );
      if (distance > allowedRadius) {
        const err = new Error(`Check-in failed: You must be within ${allowedRadius} meters of the office. (Current distance: ${Math.round(distance)}m)`);
        err.statusCode = 400;
        throw err;
      }
    }
  }
  // On WFH days: coords are optional and no radius check is performed

  const checkIn = formatTime12(new Date());
  const status = resolveCheckInStatus(checkIn);

  const locationData = (coords?.latitude !== undefined && coords?.longitude !== undefined)
    ? { lat: coords.latitude, lng: coords.longitude }
    : { lat: null, lng: null };

  if (record) {
    record.checkIn = checkIn;
    record.status = status;
    record.location = locationData;
    record.workMode = isWFHDay ? "WFH" : "Office";
    await record.save();
  } else {
    record = await Attendance.create({
      employee: employee._id,
      date: new Date(todayStr),
      status,
      checkIn,
      location: locationData,
      workMode: isWFHDay ? "WFH" : "Office",
    });
  }

  await record.populate("employee", "firstName lastName employeeId department");
  return record;
};

const employeeCheckOut = async (userId, coords) => {
  const employee = await getUserEmployee(userId);
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const todayRange = buildDateRangeForDay(todayStr);

  const record = await Attendance.findOne({ employee: employee._id, date: todayRange });
  if (!record) {
    const err = new Error("No check-in found for today");
    err.statusCode = 400;
    throw err;
  }
  if (record.status === "On Leave") {
    const err = new Error("You are marked on leave today");
    err.statusCode = 400;
    throw err;
  }
  if (!record.checkIn) {
    const err = new Error("Please check in first");
    err.statusCode = 400;
    throw err;
  }
  if (record.checkOut) {
    const err = new Error("Check-out already recorded");
    err.statusCode = 400;
    throw err;
  }

  // ── Check if this was a WFH day (either stored on record or live check) ──
  const isWFHDay = record.workMode === "WFH" || !!(await wfhService.getTodayWFH(employee._id, todayStr));

  if (!isWFHDay) {
    // ── Geofencing radius validation (office check-out only) ──
    if (!coords || coords.latitude === undefined || coords.longitude === undefined) {
      const err = new Error("Location coordinates are required to check-out");
      err.statusCode = 400;
      throw err;
    }

    const companySettings = await CompanySetting.findOne();
    if (companySettings && companySettings.latitude !== undefined && companySettings.longitude !== undefined) {
      const allowedRadius = Number(companySettings.radius) || 50;
      const distance = calculateDistance(
        Number(coords.latitude),
        Number(coords.longitude),
        Number(companySettings.latitude),
        Number(companySettings.longitude)
      );
      if (distance > allowedRadius) {
        const err = new Error(`Check-out failed: You must be within ${allowedRadius} meters of the office. (Current distance: ${Math.round(distance)}m)`);
        err.statusCode = 400;
        throw err;
      }
    }
  }

  const checkOut = formatTime12(new Date());
  const hoursWorked = calculateHours(record.checkIn, checkOut);

  record.checkOut = checkOut;
  record.hoursWorked = hoursWorked;
  if (coords?.latitude !== undefined && coords?.longitude !== undefined) {
    record.checkOutLocation = { lat: coords.latitude, lng: coords.longitude };
  }

  if (["Present", "Late", "Half Day"].includes(record.status)) {
    record.status = hoursWorked > 0 && hoursWorked < HALF_DAY_HOURS ? "Half Day" : record.status;
  }

  // Ensure workMode is correctly set on checkout record too
  if (isWFHDay) record.workMode = "WFH";

  await record.save();
  await record.populate("employee", "firstName lastName employeeId department");
  return record;
};

module.exports = {
  employeeCheckIn,
  employeeCheckOut,
};
