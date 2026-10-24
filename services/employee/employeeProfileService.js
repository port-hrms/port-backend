// @ts-nocheck
// Everything the employee profile page shows, in one call.

const Employee = require("../../models/Employee");
const User = require("../../models/User");
const Attendance = require("../../models/Attendance");
const Leave = require("../../models/Leave");
const WFHRequest = require("../../models/WFHRequest");
const Payroll = require("../../models/Payroll");
const Performance = require("../../models/Performance");
const Task = require("../../models/Task");
const { NOT_DELETED, toSafeEmployee } = require("../../utils/employeeHelpers");

const withStatus = (message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const net = (p) =>
    (p.earnings?.basic || 0) + (p.earnings?.hra || 0) + (p.earnings?.bonus || 0) -
    ((p.deductions?.pf || 0) + (p.deductions?.esi || 0) + (p.deductions?.ptax || 0) + (p.deductions?.leaveDeduction || 0));

const getEmployeeProfile = async (id) => {
    const employee = await Employee.findOne({ _id: id, ...NOT_DELETED });
    if (!employee) throw withStatus(`Employee with ID ${id} not found`, 404);

    // Current month in IST, stored as UTC-midnight days (same convention as check-in)
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const [y, m] = todayStr.split("-").map(Number);
    const monthStart = new Date(Date.UTC(y, m - 1, 1));
    const nextMonth = new Date(Date.UTC(y, m, 1));
    const yearStart = new Date(Date.UTC(y, 0, 1));

    const [user, monthAttendance, leaves, wfh, payrolls, reviews, tasks] = await Promise.all([
        User.findOne({ employee: employee._id }).select("isActive lastLogin createdAt"),
        Attendance.find({ employee: employee._id, date: { $gte: monthStart, $lt: nextMonth } }).select("status hoursWorked workMode"),
        Leave.find({ employee: employee._id }).sort({ startDate: -1 }).limit(50).populate("approvedBy", "name"),
        WFHRequest.find({ employee: employee._id }).sort({ startDate: -1 }).limit(50),
        Payroll.find({ employee: employee._id }).sort({ year: -1, month: -1 }).limit(24),
        Performance.find({ employee: employee._id }).sort({ year: -1, reviewDate: -1 }).limit(20),
        Task.find({ employee: employee._id }).sort({ date: -1, createdAt: -1 }).limit(20).populate("assignedBy", "name"),
    ]);

    const attendance = { present: 0, late: 0, halfDay: 0, absent: 0, onLeave: 0, wfh: 0, hours: 0, marked: monthAttendance.length };
    monthAttendance.forEach((a) => {
        if (a.status === "Present") attendance.present += 1;
        else if (a.status === "Late") attendance.late += 1;
        else if (a.status === "Half Day") attendance.halfDay += 1;
        else if (a.status === "Absent") attendance.absent += 1;
        else if (a.status === "On Leave") attendance.onLeave += 1;
        if (a.workMode === "WFH") attendance.wfh += 1;
        attendance.hours += Number(a.hoursWorked) || 0;
    });
    attendance.hours = Math.round(attendance.hours * 10) / 10;

    const leaveDaysThisYear = leaves
        .filter((l) => l.status === "Approved" && l.startDate >= yearStart)
        .reduce((sum, l) => sum + (l.numberOfDays || 0), 0);

    return {
        employee: {
            ...toSafeEmployee(employee),
            hasLogin: Boolean(user),
            loginActive: user ? user.isActive : false,
            lastLogin: user?.lastLogin || null,
        },
        attendance,
        leaves: {
            items: leaves,
            pending: leaves.filter((l) => l.status === "Pending").length,
            approvedDaysThisYear: leaveDaysThisYear,
        },
        wfh,
        payroll: payrolls.map((p) => ({ ...p.toObject(), netPay: net(p) })),
        reviews,
        tasks,
    };
};

module.exports = { getEmployeeProfile };
