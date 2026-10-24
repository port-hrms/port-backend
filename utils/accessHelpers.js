// @ts-nocheck
// Who counts as "admin-level" — must match authorizeRoles() in authMiddleware:
// role admin or hr, or an employee whose department or designation is "HR".
const Employee = require("../models/Employee");

const isHrEmployee = async (user) => {
    if (user?.role !== "employee" || !user.employee) return false;
    const emp = await Employee.findById(user.employee._id || user.employee).select("department designation");
    if (!emp) return false;
    return (emp.department || "").toLowerCase() === "hr" || (emp.designation || "").toLowerCase() === "hr";
};

const hasAdminAccess = async (user) => ["admin", "hr"].includes(user?.role) || isHrEmployee(user);

const ownEmployeeId = (user) => (user?.employee ? String(user.employee._id || user.employee) : null);

module.exports = { hasAdminAccess, ownEmployeeId };
