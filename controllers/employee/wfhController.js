// @ts-nocheck
const wfhService = require("../../services/wfhService");
const User = require("../../models/User");

const resolveCode = (err, fallback = 500) => err?.statusCode || fallback;

// ─── Helper: check if request user is an HR admin (same logic as authMiddleware) ─
const isHRAdmin = async (user) => {
  if (user?.role === "admin" || user?.role === "hr") return true;
  if (user?.role === "employee" && user?.employee) {
    try {
      const Employee = require("../../models/Employee");
      const emp = await Employee.findById(user.employee);
      if (emp) {
        const dept = (emp.department || "").toLowerCase();
        const desg = (emp.designation || "").toLowerCase();
        return dept === "hr" || desg === "hr";
      }
    } catch { /* ignore */ }
  }
  return false;
};

// GET /api/wfh  — employee sees own, admin/HR sees all
exports.getWFHRequests = async (req, res) => {
  try {
    const query = { ...req.query };
    // Restrict to own records only for non-admin, non-HR employees
    const adminOrHR = await isHRAdmin(req.user);
    if (!adminOrHR) {
      const user = await User.findById(req.user._id).populate("employee");
      query.employeeId = user?.employee?._id?.toString() || user?.employee?.toString();
    }
    const data = await wfhService.getWFHRequests(query);
    return res.json({ success: true, data });
  } catch (err) {
    console.error("getWFHRequests error:", err);
    return res.status(resolveCode(err)).json({ success: false, message: err.message });
  }
};

// GET /api/wfh/stats
exports.getWFHStats = async (req, res) => {
  try {
    let { employeeId } = req.query;
    // For non-admin, non-HR employees: restrict to own stats
    const adminOrHR = await isHRAdmin(req.user);
    if (!adminOrHR) {
      const user = await User.findById(req.user._id).populate("employee");
      employeeId = user?.employee?._id?.toString() || user?.employee?.toString();
    }
    // adminOrHR with no employeeId in query → pass null → service returns aggregate stats
    const data = await wfhService.getWFHStats(employeeId || null);
    return res.json({ success: true, data });
  } catch (err) {
    console.error("getWFHStats error:", err);
    return res.status(resolveCode(err)).json({ success: false, message: err.message });
  }
};

// GET /api/wfh/today  — is today a WFH day for the calling employee?
exports.getTodayWFH = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("employee");
    const employeeId = user?.employee?._id?.toString() || user?.employee?.toString();
    const wfh = await wfhService.getTodayWFH(employeeId);
    return res.json({ success: true, data: wfh || null, isWFHDay: !!wfh });
  } catch (err) {
    console.error("getTodayWFH error:", err);
    return res.status(resolveCode(err)).json({ success: false, message: err.message });
  }
};

// POST /api/wfh
exports.applyWFH = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("employee");
    const employeeId = user?.employee?._id?.toString() || user?.employee?.toString();
    const { startDate, endDate, numberOfDays, reason } = req.body;
    const data = await wfhService.applyWFH({ employee: employeeId, startDate, endDate, numberOfDays, reason });
    return res.status(201).json({ success: true, data, message: "WFH request submitted successfully" });
  } catch (err) {
    console.error("applyWFH error:", err);
    return res.status(resolveCode(err)).json({ success: false, message: err.message });
  }
};

// PUT /api/wfh/:id  — admin approve/reject
exports.updateWFHStatus = async (req, res) => {
  try {
    const data = await wfhService.updateWFHStatus(req.params.id, req.body, req.user?._id || null);
    return res.json({ success: true, data, message: `WFH request ${req.body.status.toLowerCase()} successfully` });
  } catch (err) {
    console.error("updateWFHStatus error:", err);
    return res.status(resolveCode(err)).json({ success: false, message: err.message });
  }
};

// DELETE /api/wfh/:id  — employee self-cancel
exports.cancelWFH = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("employee");
    const employeeId = user?.employee?._id?.toString() || user?.employee?.toString();
    await wfhService.cancelWFH(req.params.id, employeeId);
    return res.json({ success: true, message: "WFH request cancelled" });
  } catch (err) {
    console.error("cancelWFH error:", err);
    return res.status(resolveCode(err)).json({ success: false, message: err.message });
  }
};
