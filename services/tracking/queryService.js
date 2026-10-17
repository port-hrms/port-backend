// @ts-nocheck
const Tracking = require("../../models/Tracking");
const Employee = require("../../models/Employee");

const getLiveAgents = async () => {
    const fieldAgents = await Employee.find({
        isFieldAgent: true,
        status: "Active",
    }).select("_id firstName lastName employeeId department designation");

    if (fieldAgents.length === 0) {
        return [];
    }

    const agentIds = fieldAgents.map((a) => a._id);
    const latestPings = await Tracking.find({
        agent: { $in: agentIds },
        isLatest: true,
    }).populate("agent", "firstName lastName employeeId department designation");

    const agentMap = {};
    latestPings.forEach((ping) => {
        agentMap[ping.agent._id.toString()] = ping;
    });

    return fieldAgents.map((agent) => {
        const ping = agentMap[agent._id.toString()];
        return {
            agent: {
                _id: agent._id,
                firstName: agent.firstName,
                lastName: agent.lastName,
                employeeId: agent.employeeId,
                department: agent.department,
                designation: agent.designation,
            },
            hasLocation: !!ping,
            latitude: ping?.latitude || null,
            longitude: ping?.longitude || null,
            accuracy: ping?.accuracy || null,
            clientName: ping?.clientName || "",
            notes: ping?.notes || "",
            visitStatus: ping?.visitStatus || "Unknown",
            address: ping?.address || "",
            visitImage: ping?.visitImage || "",
            leadType: ping?.leadType || "",
            projectRequirement: ping?.projectRequirement || "",
            internshipDomain: ping?.internshipDomain || "",
            lastSeen: ping?.createdAt || null,
        };
    });
};

const getTrackingStats = async () => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);

    const [
        totalFieldAgents,
        activeToday,
        totalPingsToday,
        atClientNow,
    ] = await Promise.all([
        Employee.countDocuments({ isFieldAgent: true, status: "Active" }),
        Tracking.distinct("agent", { date: { $gte: start, $lte: end } }),
        Tracking.countDocuments({ date: { $gte: start, $lte: end } }),
        Tracking.countDocuments({ isLatest: true, visitStatus: "At Client" }),
    ]);

    return {
        totalFieldAgents,
        activeToday: activeToday.length,
        inactiveToday: totalFieldAgents - activeToday.length,
        totalPingsToday,
        atClientNow,
    };
};

module.exports = {
    getLiveAgents,
    getTrackingStats,
};
