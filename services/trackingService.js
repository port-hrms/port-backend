// @ts-nocheck
const logLocation = require("./tracking/logService");
const { getLiveAgents, getTrackingStats } = require("./tracking/queryService");
const { getAgentHistory, getAgentVisits } = require("./tracking/historyService");
const { toggleFieldAgent, deleteTracking } = require("./tracking/adminService");

module.exports = {
    logLocation,
    getLiveAgents,
    getAgentHistory,
    getAgentVisits,
    getTrackingStats,
    toggleFieldAgent,
    deleteTracking,
};
