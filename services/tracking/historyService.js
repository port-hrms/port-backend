// @ts-nocheck
const Tracking = require("../../models/Tracking");
const Employee = require("../../models/Employee");

const getAgentHistory = async (agentId, date) => {
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate.setHours(0, 0, 0, 0));
    const end = new Date(targetDate.setHours(23, 59, 59, 999));

    const agent = await Employee.findById(agentId).select("firstName lastName employeeId isFieldAgent");
    if (!agent) {
        const error = new Error("Agent not found");
        error.statusCode = 404;
        throw error;
    }

    const history = await Tracking.find({
        agent: agentId,
        date: { $gte: start, $lte: end },
    }).sort({ createdAt: 1 });

    const summary = {
        totalPings: history.length,
        clientsVisited: [...new Set(history.filter((h) => h.clientName).map((h) => h.clientName))],
        timeOnField: history.length > 1
            ? Math.round((new Date(history[history.length - 1].createdAt) - new Date(history[0].createdAt)) / 60000)
            : 0,
        firstPing: history[0]?.createdAt || null,
        lastPing: history[history.length - 1]?.createdAt || null,
    };

    return {
        agent: {
            name: `${agent.firstName} ${agent.lastName}`,
            employeeId: agent.employeeId,
        },
        summary,
        history,
    };
};

const getAgentVisits = async (agentId) => {
    const agent = await Employee.findById(agentId).select("firstName lastName employeeId isFieldAgent");
    if (!agent) {
        const error = new Error("Agent not found");
        error.statusCode = 404;
        throw error;
    }

    const visits = await Tracking.find({
        agent: agentId,
        clientName: { $exists: true, $ne: "" },
    }).sort({ createdAt: -1 });

    return {
        agent: {
            name: `${agent.firstName} ${agent.lastName}`,
            employeeId: agent.employeeId,
        },
        visits,
    };
};

module.exports = {
    getAgentHistory,
    getAgentVisits,
};
