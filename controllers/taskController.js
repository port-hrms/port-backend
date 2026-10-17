// @ts-nocheck

const taskService = require("../services/taskService");
const { sendSuccess, sendError } = require("../utils/responseHandler");

const createTask = async (req, res) => {
  try {
    const task = await taskService.createTask(req.body, req.user?._id);
    return sendSuccess(res, task, "Task assigned successfully", 201);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.message);
  }
};

const getTasks = async (req, res) => {
  try {
    const tasks = await taskService.getTasks(req.query, req.user);
    return sendSuccess(res, tasks);
  } catch (error) {
    return sendError(res, "Failed to fetch tasks", 500, error.message);
  }
};

const addTaskUpdate = async (req, res) => {
  try {
    const task = await taskService.addTaskUpdate(req.params.id, req.body, req.user);
    return sendSuccess(res, task, "Update saved successfully");
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.message);
  }
};

module.exports = {
  createTask,
  getTasks,
  addTaskUpdate,
};
