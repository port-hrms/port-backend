// @ts-nocheck

const Notification = require("../models/Notification");

const createNotification = async ({ recipientUser, recipientRole, title, message, type, link }) => {
  return Notification.create({
    recipientUser: recipientUser || null,
    recipientRole: recipientRole || "",
    title,
    message,
    type: type || "info",
    link: link || "",
  });
};

const getNotificationsForUser = async (user, { limit = 10, unreadOnly = false } = {}) => {
  const filter = { $or: [] };
  if (user?.role) filter.$or.push({ recipientRole: user.role });
  if (user?._id) filter.$or.push({ recipientUser: user._id });

  if (filter.$or.length === 0) {
    delete filter.$or;
  }

  if (unreadOnly) {
    filter.isRead = false;
  }

  return Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(Number(limit) || 10);
};

const markNotificationRead = async (notificationId, user) => {
  const filter = {
    _id: notificationId,
    $or: [{ recipientUser: user._id }, { recipientRole: user.role }],
  };

  return Notification.findOneAndUpdate(filter, { isRead: true }, { new: true });
};

const markAllRead = async (user) => {
  const filter = {
    $or: [{ recipientUser: user._id }, { recipientRole: user.role }],
  };

  return Notification.updateMany(filter, { $set: { isRead: true } });
};

module.exports = {
  createNotification,
  getNotificationsForUser,
  markNotificationRead,
  markAllRead,
};
