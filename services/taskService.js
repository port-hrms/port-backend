// @ts-nocheck

const Task = require("../models/Task");
const User = require("../models/User");
const { buildDateRangeForDay } = require("../utils/attendanceHelpers");

const withStatus = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const createTask = async ({ employee, date, title, description }, assignedBy) => {
  if (!employee || !date || !title) {
    throw withStatus("Employee, date, and title are required", 400);
  }

  const task = await Task.create({
    employee,
    assignedBy,
    date: new Date(date),
    title,
    description: description || "",
  });

  return task.populate("employee", "firstName lastName employeeId department designation");
};

const getTasks = async (query, user) => {
  const { date, employeeId, status } = query || {};
  const filter = {};

  if (date) {
    filter.date = buildDateRangeForDay(date);
  }

  if (status) {
    filter.status = status;
  }

  if (user?.role === "employee") {
    const employeeUser = await User.findById(user._id).populate("employee");
    if (!employeeUser?.employee?._id) {
      return [];
    }
    // See tasks assigned TO me OR assigned BY me
    filter.$or = [
      { employee: employeeUser.employee._id },
      { assignedBy: user._id }
    ];
  } else if (employeeId) {
    filter.employee = employeeId;
  }

  return Task.find(filter)
    .populate("employee", "firstName lastName employeeId department designation")
    .populate("assignedBy", "name email")
    .sort({ date: -1, createdAt: -1 });
};

const addTaskUpdate = async (taskId, { message, status }, user) => {
  if (!message) {
    throw withStatus("Update message is required", 400);
  }

  const task = await Task.findById(taskId).populate("employee", "_id");
  if (!task) {
    throw withStatus("Task not found", 404);
  }

  if (user?.role === "employee") {
    const employeeUser = await User.findById(user._id).populate("employee");
    if (!employeeUser?.employee?._id) {
      throw withStatus("Employee profile not found", 404);
    }
    if (String(task.employee?._id) !== String(employeeUser.employee._id)) {
      throw withStatus("Not authorized to update this task", 403);
    }
  }

  const nextStatus = status || task.status;
  task.updates.unshift({
    message,
    status: nextStatus,
    updatedBy: user?._id || null,
    updatedByRole: user?.role || "",
  });
  task.status = nextStatus;

  await task.save();
  return Task.findById(taskId)
    .populate("employee", "firstName lastName employeeId department designation")
    .populate("assignedBy", "name email");
};

module.exports = {
  createTask,
  getTasks,
  addTaskUpdate,
};
