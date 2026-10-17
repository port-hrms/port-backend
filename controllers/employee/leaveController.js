// @ts-nocheck
const leaveService = require("../../services/leaveService");

const resolveStatusCode = (error, fallback = 500) => error?.statusCode || fallback;

// Get all leaves for an employee
exports.getLeaves = async (req, res) => {
  try {
    const leaves = await leaveService.getLeaves(req.query);

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
    const stats = await leaveService.getLeaveStats(req.query.employeeId);

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
    const newLeave = await leaveService.createLeave(req.body);

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
    const leaves = await leaveService.getRecentLeaves(req.query.employeeId);

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
    await leaveService.deleteLeave(req.params.leaveId);

    return res.json({
      success: true,
      message: "Leave request deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting leave:", error);
    return res.status(resolveStatusCode(error, 500)).json({ success: false, message: "Failed to delete leave", error: error.message });
  }
};
