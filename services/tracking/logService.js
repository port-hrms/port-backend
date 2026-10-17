// @ts-nocheck
const Tracking = require("../../models/Tracking");
const Employee = require("../../models/Employee");

const logLocation = async (data, file) => {
    const {
        agentId,
        latitude,
        longitude,
        accuracy,
        clientName,
        notes,
        visitStatus,
        address,
        leadType,
        projectRequirement,
        internshipDomain,
    } = data;

    if (!agentId || !latitude || !longitude) {
        const error = new Error("agentId, latitude and longitude are required");
        error.statusCode = 400;
        throw error;
    }

    const agent = await Employee.findById(agentId);
    if (!agent) {
        const error = new Error("Agent (employee) not found");
        error.statusCode = 404;
        throw error;
    }
    if (!agent.isFieldAgent) {
        const error = new Error(`${agent.firstName} ${agent.lastName} is not marked as a Field Agent`);
        error.statusCode = 400;
        throw error;
    }

    await Tracking.updateMany(
        { agent: agentId, isLatest: true },
        { $set: { isLatest: false } }
    );

    let visitImage = data.visitImage || "";
    if (file) {
        visitImage = `/uploads/images/${file.filename}`;
    }

    const ping = await Tracking.create({
        agent: agentId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: accuracy || 0,
        clientName: clientName || "",
        notes: notes || "",
        visitStatus: visitStatus || "Travelling",
        address: address || "",
        visitImage,
        leadType: leadType || "",
        projectRequirement: projectRequirement || "",
        internshipDomain: internshipDomain || "",
        date: new Date(),
        isLatest: true,
    });

    await ping.populate("agent", "firstName lastName employeeId department designation");
    return ping;
};

module.exports = logLocation;
