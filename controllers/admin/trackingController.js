// @ts-nocheck
const trackingService = require("../../services/trackingService");

const logLocation = async (req, res) => {
    try {
        const ping = await trackingService.logLocation(req.body, req.file);
        res.status(201).json({
            success: true,
            message: "Location logged successfully",
            data: ping,
        });
    } catch (error) {
        res.status(error.statusCode || 400).json({
            success: false,
            message: error.message || "Error logging location",
        });
    }
};

const getLiveAgents = async (req, res) => {
    try {
        const result = await trackingService.getLiveAgents();
        res.status(200).json({
            success: true,
            count: result.length,
            data: result,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Error fetching live agent locations",
        });
    }
};

const getAgentHistory = async (req, res) => {
    try {
        const { agentId } = req.params;
        const { date } = req.query;

        // Authorize: user must be admin, HR, or the agent themselves
        const isSelf = req.user.employee && req.user.employee.toString() === agentId.toString();
        const isAdminOrHR = req.user.role === "admin" || req.user.role === "hr";
        let isAuthorized = isSelf || isAdminOrHR;

        // Check if employee is in HR department
        if (!isAuthorized && req.user.role === "employee" && req.user.employee) {
            const Employee = require("../../models/Employee");
            const emp = await Employee.findById(req.user.employee);
            if (emp) {
                const dept = (emp.department || "").toLowerCase();
                const desg = (emp.designation || "").toLowerCase();
                if (dept === "hr" || desg === "hr") {
                    isAuthorized = true;
                }
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only view your own history.",
            });
        }

        const { agent, summary, history } = await trackingService.getAgentHistory(agentId, date);
        res.status(200).json({
            success: true,
            agent,
            summary,
            data: history,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Error fetching agent history",
        });
    }
};

const getTrackingStats = async (req, res) => {
    try {
        const stats = await trackingService.getTrackingStats();
        res.status(200).json({
            success: true,
            data: stats,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Error fetching tracking stats",
        });
    }
};

const toggleFieldAgent = async (req, res) => {
    try {
        const employee = await trackingService.toggleFieldAgent(req.params.employeeId);
        res.status(200).json({
            success: true,
            message: `${employee.firstName} ${employee.lastName} is now ${employee.isFieldAgent ? "✅ a Field Agent" : "❌ no longer a Field Agent"}`,
            data: employee,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Error toggling field agent status",
        });
    }
};

const getAgentVisits = async (req, res) => {
    try {
        const { agentId } = req.params;

        // Authorize: user must be admin, HR, or the agent themselves
        const isSelf = req.user.employee && req.user.employee.toString() === agentId.toString();
        const isAdminOrHR = req.user.role === "admin" || req.user.role === "hr";
        let isAuthorized = isSelf || isAdminOrHR;

        // Check if employee is in HR department
        if (!isAuthorized && req.user.role === "employee" && req.user.employee) {
            const Employee = require("../../models/Employee");
            const emp = await Employee.findById(req.user.employee);
            if (emp) {
                const dept = (emp.department || "").toLowerCase();
                const desg = (emp.designation || "").toLowerCase();
                if (dept === "hr" || desg === "hr") {
                    isAuthorized = true;
                }
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only view your own visits history.",
            });
        }

        const { agent, visits } = await trackingService.getAgentVisits(agentId);
        res.status(200).json({
            success: true,
            agent,
            data: visits,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Error fetching agent visits history",
        });
    }
};

const deleteTracking = async (req, res) => {
    try {
        await trackingService.deleteTracking(req.params.id);
        res.status(200).json({
            success: true,
            message: "Tracking record deleted",
            data: {},
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Error deleting record",
        });
    }
};

module.exports = {
    logLocation,
    getLiveAgents,
    getAgentHistory,
    getAgentVisits,
    getTrackingStats,
    toggleFieldAgent,
    deleteTracking,
};