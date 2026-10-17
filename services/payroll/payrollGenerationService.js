// @ts-nocheck

const Payroll = require("../../models/Payroll");
const Employee = require("../../models/Employee");
const { parseInteger, buildSalaryComponents } = require("../../utils/payrollHelpers");
const {
  toNumber,
  getEmployeeOrThrow,
  getAttendanceSummary,
  withStatus,
} = require("./payrollSharedService");

const generatePayroll = async (payload) => {
  const {
    employeeId,
    month,
    year,
    attendance = {},
    earnings = {},
    deductions = {},
    payment = {},
  } = payload;

  const parsedMonth = parseInteger(month);
  const parsedYear = parseInteger(year);

  const employee = await getEmployeeOrThrow(employeeId);

  if (!payload.attendance || !payload.earnings || !payload.deductions || !payload.payment) {
    throw withStatus("Structured payroll payload is required", 400);
  }

  const attendancePayload = {
    workingDays: toNumber(attendance.workingDays, 26),
    presentDays: toNumber(attendance.presentDays, 0),
    lopDays: toNumber(attendance.lopDays, 0),
  };

  const earningsPayload = {
    basic: toNumber(earnings.basic, employee.salary || 0),
    hra: toNumber(earnings.hra, 0),
    bonus: toNumber(earnings.bonus, 0),
  };

  const deductionsPayload = {
    pf: toNumber(deductions.pf, 0),
    esi: toNumber(deductions.esi, 0),
    ptax: toNumber(deductions.ptax, 0),
    leaveDeduction: toNumber(deductions.leaveDeduction, 0),
  };

  const paymentPayload = {
    status: payment.status || "Processed",
    mode: payment.mode || "Bank Transfer",
    date: payment.date ? new Date(payment.date) : undefined,
  };

  const payrollPayload = {
    employee: employeeId,
    month: parsedMonth,
    year: parsedYear,
    attendance: attendancePayload,
    earnings: earningsPayload,
    deductions: deductionsPayload,
    payment: paymentPayload,
  };

  let payroll = await Payroll.findOne({
    employee: employeeId,
    month: parsedMonth,
    year: parsedYear,
  });

  const isUpdated = Boolean(payroll);

  if (payroll) {
    Object.assign(payroll, payrollPayload);
    await payroll.save();
  } else {
    payroll = await Payroll.create(payrollPayload);
  }

  await payroll.populate("employee", "firstName lastName employeeId department designation");

  return {
    payroll,
    isUpdated,
    message: isUpdated
      ? `Payroll re-generated for ${employee.firstName} ${employee.lastName}`
      : `Payroll generated for ${employee.firstName} ${employee.lastName}`,
  };
};

const runPayrollForAll = async (payload) => {
  const parsedMonth = parseInteger(payload.month);
  const parsedYear = parseInteger(payload.year);

  const employees = await Employee.find({ status: "Active" });
  if (employees.length === 0) {
    throw withStatus("No active employees found", 400);
  }

  const results = { success: [], skipped: [], failed: [] };

  for (const employee of employees) {
    try {
      const existing = await Payroll.findOne({
        employee: employee._id,
        month: parsedMonth,
        year: parsedYear,
      });

      if (existing) {
        results.skipped.push(`${employee.firstName} ${employee.lastName} (already exists)`);
        continue;
      }

      const attendanceSummary = await getAttendanceSummary(employee._id, parsedMonth, parsedYear);
      const salaryParts = buildSalaryComponents(employee.salary, attendanceSummary.absentDays);

      const payrollPayload = {
        employee: employee._id,
        month: parsedMonth,
        year: parsedYear,
        attendance: {
          workingDays: 26,
          presentDays: attendanceSummary.presentDays,
          lopDays: attendanceSummary.absentDays,
        },
        earnings: {
          basic: salaryParts.basic,
          hra: salaryParts.houseRentAllowance,
          bonus: 0,
        },
        deductions: {
          pf: salaryParts.providentFund,
          esi: salaryParts.esi,
          ptax: salaryParts.professionalTax,
          leaveDeduction: salaryParts.leaveDeduction,
        },
        payment: {
          status: "Processed",
          mode: "Bank Transfer",
          date: undefined,
        },
      };

      await Payroll.create(payrollPayload);
      results.success.push(`${employee.firstName} ${employee.lastName}`);
    } catch (error) {
      results.failed.push(`${employee.firstName} ${employee.lastName}: ${error.message}`);
    }
  }

  return {
    results,
    message: `Payroll run complete: ${results.success.length} generated, ${results.skipped.length} skipped, ${results.failed.length} failed`,
  };
};

module.exports = {
  generatePayroll,
  runPayrollForAll,
};
