// @ts-nocheck
const leaveService = require("../../services/leaveService");

const resolveStatusCode = (error, fallback = 500) => error?.statusCode || fallback;

// Employees may only see and act on their own leave records; admins/HR staff see everyone's.
const { hasAdminAccess, ownEmployeeId } = require("../../utils/accessHelpers");

const forbidden = (res, message = "You can only access your own leave records") =>
  res.status(403).json({ success: false, message });

// Returns the employee id the request is allowed to read, or null after sending 403.
const resolveReadableEmployee = async (req, res) => {
  if (await hasAdminAccess(req.user)) return req.query.employeeId;
  const own = ownEmployeeId(req.user);
  if (!own) { forbidden(res, "Your account is not linked to an employee profile"); return null; }
  if (req.query.employeeId && String(req.query.employeeId) !== own) { forbidden(res); return null; }
  return own;
};

// Get all leaves for an employee
exports.getLeaves = async (req, res) => {
  try {
    const employeeId = await resolveReadableEmployee(req, res);
    if (employeeId === null) return;
    const leaves = await leaveService.getLeaves({ ...req.query, employeeId });

    return res.json({
      success: true,
      data: leaves,
    });
  } catch (error) {
    console.error("Error fetching leaves:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch leaves", error: error.message });
  }
};

// Get leave statistics for an employee
exports.getLeaveStats = async (req, res) => {
  try {
    const employeeId = await resolveReadableEmployee(req, res);
    if (employeeId === null) return;
    const stats = await leaveService.getLeaveStats(employeeId);

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching leave stats:", error);
    return res.status(resolveStatusCode(error, 500)).json({ success: false, message: "Failed to fetch leave stats", error: error.message });
  }
};

// Create a new leave request
exports.createLeave = async (req, res) => {
  try {
    // Employees always apply for themselves, whatever the request body says
    const payload = { ...req.body };
    if (!(await hasAdminAccess(req.user))) {
      const own = ownEmployeeId(req.user);
      if (!own) return forbidden(res, "Your account is not linked to an employee profile");
      payload.employee = own;
    }
    const newLeave = await leaveService.createLeave(payload);

    return res.status(201).json({
      success: true,
      data: newLeave,
      message: "Leave request submitted successfully",
    });
  } catch (error) {
    console.error("Error creating leave:", error);
    return res.status(resolveStatusCode(error, 500)).json({ success: false, message: "Failed to create leave request", error: error.message });
  }
};

// Get recent leave requests for an employee
exports.getRecentLeaves = async (req, res) => {
  try {
    const employeeId = await resolveReadableEmployee(req, res);
    if (employeeId === null) return;
    const leaves = await leaveService.getRecentLeaves(employeeId);

    return res.json({
      success: true,
      data: leaves,
    });
  } catch (error) {
    console.error("Error fetching recent leaves:", error);
    return res.status(resolveStatusCode(error, 500)).json({ success: false, message: "Failed to fetch recent leaves", error: error.message });
  }
};

// Update a leave request (approve/reject/cancel)
exports.updateLeave = async (req, res) => {
  try {
    const leave = await leaveService.updateLeave(req.params.leaveId, req.body, req.user?._id || null);

    return res.json({
      success: true,
      data: leave,
      message: `Leave ${req.body.status.toLowerCase()} successfully`,
    });
  } catch (error) {
    console.error("Error updating leave:", error);
    return res.status(resolveStatusCode(error, 500)).json({ success: false, message: "Failed to update leave", error: error.message });
  }
};

// Delete a leave request (only if pending)
exports.deleteLeave = async (req, res) => {
  try {
    // Employees can withdraw only their own requests that are still pending
    const isStaff = await hasAdminAccess(req.user);
    const restrictTo = isStaff ? null : ownEmployeeId(req.user);
    if (!isStaff && !restrictTo) {
      return forbidden(res, "Your account is not linked to an employee profile");
    }
    await leaveService.deleteLeave(req.params.leaveId, restrictTo);

    return res.json({
      success: true,
      message: "Leave request deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting leave:", error);
    return res.status(resolveStatusCode(error, 500)).json({ success: false, message: "Failed to delete leave", error: error.message });
  }
};
