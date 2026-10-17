// @ts-nocheck

const notificationService = require("../services/notificationService");
const { sendSuccess, sendError, sendNotFound } = require("../utils/responseHandler");

const getNotifications = async (req, res) => {
  try {
    const { limit = 10, unread } = req.query || {};
    const unreadOnly = String(unread) === "1" || String(unread).toLowerCase() === "true";
    const notifications = await notificationService.getNotificationsForUser(req.user, { limit, unreadOnly });
    return sendSuccess(res, notifications);
  } catch (error) {
    return sendError(res, "Failed to fetch notifications", 500, error.message);
  }
};

const markRead = async (req, res) => {
  try {
    const record = await notificationService.markNotificationRead(req.params.id, req.user);
    if (!record) return sendNotFound(res, "Notification");
    return sendSuccess(res, record, "Notification marked as read");
  } catch (error) {
    return sendError(res, "Failed to update notification", 500, error.message);
  }
};

const markAllRead = async (req, res) => {
  try {
    await notificationService.markAllRead(req.user);
    return sendSuccess(res, {}, "Notifications marked as read");
  } catch (error) {
    return sendError(res, "Failed to update notifications", 500, error.message);
  }
};

module.exports = {
  getNotifications,
  markRead,
  markAllRead,
};
