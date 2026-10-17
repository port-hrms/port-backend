// @ts-nocheck

const createAttendanceSummary = (attendanceToday = []) => {
  const summary = {
    present: 0,
    absent: 0,
    onLeave: 0,
    halfDay: 0,
    late: 0,
  };

  attendanceToday.forEach((item) => {
    if (item._id === "Present") summary.present = item.count;
    else if (item._id === "Absent") summary.absent = item.count;
    else if (item._id === "On Leave") summary.onLeave = item.count;
    else if (item._id === "Half Day") summary.halfDay = item.count;
    else if (item._id === "Late") summary.late = item.count;
  });

  return summary;
};

const createGradeDistribution = (performanceRecords = []) => {
  const gradeDistribution = {};
  performanceRecords.forEach((record) => {
    if (record.grade) {
      gradeDistribution[record.grade] = (gradeDistribution[record.grade] || 0) + 1;
    }
  });
  return gradeDistribution;
};

const createEmployeeAttendanceSummary = (attendanceRecords = []) => {
  const summary = {
    totalDays: attendanceRecords.length,
    present: attendanceRecords.filter((record) => record.status === "Present").length,
    absent: attendanceRecords.filter((record) => record.status === "Absent").length,
    onLeave: attendanceRecords.filter((record) => record.status === "On Leave").length,
    halfDay: attendanceRecords.filter((record) => record.status === "Half Day").length,
    late: attendanceRecords.filter((record) => record.status === "Late").length,
    totalHours: Number(attendanceRecords.reduce((sum, record) => sum + (record.hoursWorked || 0), 0).toFixed(1)),
  };

  const productiveDays = summary.present + summary.late + (summary.halfDay * 0.5);
  const attendanceRate = summary.totalDays ? Math.round((productiveDays / summary.totalDays) * 100) : 0;

  return { summary, attendanceRate };
};

const createEmployeeProfilePayload = (employee, user) => {
  return {
    _id: employee._id,
    name: `${employee.firstName} ${employee.lastName}`,
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email || user.email,
    phone: employee.phone || null,
    dateOfBirth: employee.dateOfBirth || null,
    gender: employee.gender || null,
    address: employee.address || null,
    avatar: employee.avatar || null,
    employeeId: employee.employeeId,
    department: employee.department,
    designation: employee.designation,
    employmentType: employee.employmentType,
    joiningDate: employee.joiningDate,
    status: employee.status,
    isFieldAgent: employee.isFieldAgent,
    hasEmployeeRecord: true,
  };
};

module.exports = {
  createAttendanceSummary,
  createGradeDistribution,
  createEmployeeAttendanceSummary,
  createEmployeeProfilePayload,
};
