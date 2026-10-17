// @ts-nocheck


const dashboardService = require("../services/dashboardService");

const resolveStatusCode = (error, fallback = 500) => error?.statusCode || fallback;

// GET /api/dashboard/stats
const getStats = async (req, res) => {
    try {
        const data = await dashboardService.getDashboardStats();
        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("Dashboard stats error:", error);
        return res.status(resolveStatusCode(error, 500)).json({
            success: false,
            message: "Failed to fetch dashboard stats",
            error: error.message,
        });
    }
};

// GET /api/dashboard/employee
const getEmployeeStats = async (req, res) => {
    try {
        const data = await dashboardService.getEmployeeDashboardStats(req.user._id);
        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        console.error("Employee dashboard stats error:", error);
        return res.status(resolveStatusCode(error, 500)).json({
            success: false,
            message: "Failed to fetch employee dashboard stats",
            error: error.message,
        });
    }
};

module.exports = { getStats, getEmployeeStats };
