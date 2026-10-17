// @ts-nocheck

const parseInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizeEmployeeRef = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value._id) return value._id;
    if (value.id) return value.id;
  }
  return value;
};

const buildPayrollFilter = ({ month, year, status, employeeId }, user) => {
  const filter = {};

  const parsedMonth = parseInteger(month);
  const parsedYear = parseInteger(year);

  if (parsedMonth) filter.month = parsedMonth;
  if (parsedYear) filter.year = parsedYear;
  if (status && status !== "All") filter["payment.status"] = status;

  if (user?.role === "employee") {
    const employeeRef = normalizeEmployeeRef(user.employee);
    if (!employeeRef) return null;
    filter.employee = employeeRef;
  } else if (employeeId) {
    filter.employee = normalizeEmployeeRef(employeeId);
  }

  return filter;
};

const getMonthRange = (month, year) => {
  const parsedMonth = parseInteger(month);
  const parsedYear = parseInteger(year);

  return {
    startDate: new Date(parsedYear, parsedMonth - 1, 1),
    endDate: new Date(parsedYear, parsedMonth, 0, 23, 59, 59),
    month: parsedMonth,
    year: parsedYear,
  };
};

const summarizeAttendance = (attendanceRecords) => {
  const presentDays = attendanceRecords.filter((record) => ["Present", "Late", "Half Day"].includes(record.status)).length;
  const absentDays = attendanceRecords.filter((record) => record.status === "Absent").length;
  const leaveDays = attendanceRecords.filter((record) => record.status === "On Leave").length;

  return { presentDays, absentDays, leaveDays };
};

const buildSalaryComponents = (basicSalary, absentDays) => {
  const basic = Number(basicSalary) || 0;
  const houseRentAllowance = Math.round(basic * 0.4);
  const medicalAllowance = 1250;
  const travelAllowance = 800;
  const providendFundRate = 0.12; // PF at 12%
  const esiRate = 0.0367; // ESI at 3.67%
  const ptax = 200; // Professional Tax

  const providentFund = Math.round(basic * providendFundRate);
  const esi = Math.round(basic * esiRate);
  const professionalTax = ptax;
  const perDaySalary = Math.round(basic / 26);
  const leaveDeduction = absentDays > 0 ? Math.round(perDaySalary * absentDays) : 0;

  return {
    basic,
    houseRentAllowance,
    medicalAllowance,
    travelAllowance,
    providentFund,
    esi,
    professionalTax,
    leaveDeduction,
  };
};

const buildSinglePayrollPayload = ({
  employeeId,
  month,
  year,
  salaryParts,
  attendanceSummary,
  bonus = 0,
  overtime = 0,
  loanDeduction = 0,
  otherDeductions = 0,
  otherEarnings = 0,
  remarks = "",
  paymentMethod = "Bank Transfer",
}) => ({
  employee: employeeId,
  month,
  year,
  basicSalary: salaryParts.basic,
  houseRentAllowance: salaryParts.houseRentAllowance,
  medicalAllowance: salaryParts.medicalAllowance,
  travelAllowance: salaryParts.travelAllowance,
  bonus: Number(bonus),
  overtime: Number(overtime),
  otherEarnings: Number(otherEarnings),
  providentFund: salaryParts.providentFund,
  esi: salaryParts.esi,
  professionalTax: salaryParts.professionalTax,
  incomeTax: 0,
  loanDeduction: Number(loanDeduction),
  leaveDeduction: salaryParts.leaveDeduction,
  otherDeductions: Number(otherDeductions),
  workingDays: 26,
  presentDays: attendanceSummary.presentDays,
  absentDays: attendanceSummary.absentDays,
  leaveDays: attendanceSummary.leaveDays,
  status: "Processed",
  paymentMethod,
  remarks,
});

const buildBulkPayrollPayload = ({ employeeId, month, year, salaryParts, attendanceSummary }) => ({
  employee: employeeId,
  month,
  year,
  basicSalary: salaryParts.basic,
  houseRentAllowance: salaryParts.houseRentAllowance,
  medicalAllowance: salaryParts.medicalAllowance,
  travelAllowance: salaryParts.travelAllowance,
  bonus: 0,
  overtime: 0,
  otherEarnings: 0,
  providentFund: salaryParts.providentFund,
  esi: salaryParts.esi,
  professionalTax: salaryParts.professionalTax,
  incomeTax: 0,
  loanDeduction: 0,
  leaveDeduction: salaryParts.leaveDeduction,
  otherDeductions: 0,
  workingDays: 26,
  presentDays: attendanceSummary.presentDays,
  absentDays: attendanceSummary.absentDays,
  leaveDays: attendanceSummary.leaveDays,
  status: "Processed",
  paymentMethod: "Bank Transfer",
});

const buildPayrollSummaryStats = (records) => {
  const getGross = (record) =>
    Number(record?.earnings?.basic || 0) + Number(record?.earnings?.hra || 0) + Number(record?.earnings?.bonus || 0);

  const getTotalDeductions = (record) => 
    Number(record?.deductions?.pf || 0) + 
    Number(record?.deductions?.ptax || 0) + 
    Number(record?.deductions?.esi || 0) + 
    Number(record?.deductions?.leaveDeduction || 0);

  const getNet = (record) => getGross(record) - getTotalDeductions(record);

  const totalPayroll = records.reduce((sum, record) => sum + getNet(record), 0);
  const totalPaid = records
    .filter((record) => record?.payment?.status === "Paid")
    .reduce((sum, record) => sum + getNet(record), 0);
  const totalPending = records
    .filter((record) => record?.payment?.status !== "Paid")
    .reduce((sum, record) => sum + getNet(record), 0);
  const paidCount = records.filter((record) => record?.payment?.status === "Paid").length;
  const pendingCount = records.filter((record) => record?.payment?.status !== "Paid").length;

  return {
    totalPayroll,
    totalPaid,
    totalPending,
    totalRecords: records.length,
    paidCount,
    pendingCount,
  };
};

module.exports = {
  parseInteger,
  buildPayrollFilter,
  getMonthRange,
  summarizeAttendance,
  buildSalaryComponents,
  buildSinglePayrollPayload,
  buildBulkPayrollPayload,
  buildPayrollSummaryStats,
};
