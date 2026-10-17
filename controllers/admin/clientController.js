const clientService = require("../../services/client/clientService");
const { sendSuccess, sendError, sendNotFound } = require("../../utils/responseHandler");

const getAll = async (req, res) => {
  try {
    const result = await clientService.getAll(req.query);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const getById = async (req, res) => {
  try {
    const client = await clientService.getById(req.params.id);
    return sendSuccess(res, client);
  } catch (error) {
    if (error.statusCode === 404) return sendNotFound(res, "Client");
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const create = async (req, res) => {
  try {
    const client = await clientService.create(req.body);
    return sendSuccess(res, client, "Client created successfully", 201);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const update = async (req, res) => {
  try {
    const client = await clientService.update(req.params.id, req.body);
    return sendSuccess(res, client, "Client updated successfully");
  } catch (error) {
    if (error.statusCode === 404) return sendNotFound(res, "Client");
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const remove = async (req, res) => {
  try {
    await clientService.remove(req.params.id);
    return sendSuccess(res, null, "Client deleted successfully");
  } catch (error) {
    if (error.statusCode === 404) return sendNotFound(res, "Client");
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const getStats = async (req, res) => {
  try {
    const stats = await clientService.getStats();
    return sendSuccess(res, stats);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
};

module.exports = { getAll, getById, create, update, remove, getStats };
