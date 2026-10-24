// @ts-nocheck
// Background attendance jobs (run at startup and every 15 minutes).
//  • Flags past days where someone checked in but never checked out.
//  • Reminds employees still checked in 30 minutes after the shift ends.
// Both are idempotent. Note: on hosts that sleep when idle (e.g. Render free tier)
// they run when the server wakes up; missed check-outs are also detected on read.

const Attendance = require("../../models/Attendance");
const User = require("../../models/User");
const { createNotification } = require("../notificationService");
const { SHIFT_END, toMinutes, todayIST, isWeeklyOff } = require("../../utils/attendanceTime");

const WORKING = ["Present", "Late", "Half Day"];
const REMINDER_AFTER_MINUTES = 30;
const INTERVAL_MS = 15 * 60 * 1000;

const NO_TIME = { $in: ["", null] };

const flagMissedCheckOuts = async () => {
  const todayStart = new Date(`${todayIST()}T00:00:00.000Z`);
  const res = await Attendance.updateMany(
    {
      date: { $lt: todayStart },
      status: { $in: WORKING },
      checkIn: { $nin: ["", null] },
      checkOut: NO_TIME,
      missedCheckOut: { $ne: true },
    },
    {
      $set: { missedCheckOut: true },
      $push: { history: { at: new Date(), byName: "System", action: "missed-check-out", reason: "No check-out recorded for the day" } },
    }
  );
  return res.modifiedCount;
};

const nowMinutesIST = () => {
  const t = new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
  return toMinutes(t);
};

const sendCheckoutReminders = async () => {
  const today = todayIST();
  if (isWeeklyOff(today)) return 0;
  if (nowMinutesIST() < toMinutes(SHIFT_END) + REMINDER_AFTER_MINUTES) return 0;

  const open = await Attendance.find({
    date: new Date(`${today}T00:00:00.000Z`),
    status: { $in: WORKING },
    checkIn: { $nin: ["", null] },
    checkOut: NO_TIME,
    checkoutReminderSentAt: null,
  }).select("employee checkIn");

  let sent = 0;
  for (const record of open) {
    const user = await User.findOne({ employee: record.employee, isActive: true }).select("_id");
    if (user) {
      await createNotification({
        recipientUser: user._id,
        title: "Don't forget to check out",
        message: `You checked in at ${record.checkIn} and haven't checked out yet. Check out from the Attendance page before you leave.`,
        type: "attendance",
      });
      sent += 1;
    }
    record.checkoutReminderSentAt = new Date();
    await record.save();
  }
  return sent;
};

const runAttendanceJobs = async () => {
  try {
    const flagged = await flagMissedCheckOuts();
    const reminded = await sendCheckoutReminders();
    if (flagged || reminded) console.log(`Attendance jobs: ${flagged} missed check-out(s) flagged, ${reminded} reminder(s) sent`);
  } catch (error) {
    console.error("Attendance jobs failed:", error.message);
  }
};

let timer = null;
const startAttendanceJobs = () => {
  if (timer) return;
  runAttendanceJobs();
  timer = setInterval(runAttendanceJobs, INTERVAL_MS);
  timer.unref?.(); // don't keep the process alive just for this
};

module.exports = { startAttendanceJobs, runAttendanceJobs, flagMissedCheckOuts, sendCheckoutReminders };
