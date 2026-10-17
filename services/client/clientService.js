const Client = require("../../models/Client");

const getAll = async (query = {}) => {
  const filter = { is_deleted: false };
  if (query.search) {
    const regex = new RegExp(query.search, "i");
    filter.$or = [
      { name: regex },
      { companyName: regex },
      { email: regex },
      { phone: regex },
    ];
  }
  if (query.status) filter.status = query.status;

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 50;
  const skip = (page - 1) * limit;

  const [clients, total] = await Promise.all([
    Client.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Client.countDocuments(filter),
  ]);

  return { clients, total, page, limit, pages: Math.ceil(total / limit) };
};

const getById = async (id) => {
  const client = await Client.findOne({ _id: id, is_deleted: false });
  if (!client) throw Object.assign(new Error("Client not found"), { statusCode: 404 });
  return client;
};

const create = async (data) => {
  const client = await Client.create(data);
  return client;
};

const update = async (id, data) => {
  const client = await Client.findOneAndUpdate(
    { _id: id, is_deleted: false },
    data,
    { new: true, runValidators: true }
  );
  if (!client) throw Object.assign(new Error("Client not found"), { statusCode: 404 });
  return client;
};

const remove = async (id) => {
  const client = await Client.findOneAndUpdate(
    { _id: id, is_deleted: false },
    { is_deleted: true },
    { new: true }
  );
  if (!client) throw Object.assign(new Error("Client not found"), { statusCode: 404 });
  return client;
};

const getStats = async () => {
  const total = await Client.countDocuments({ is_deleted: false });
  const active = await Client.countDocuments({ is_deleted: false, status: "Active" });
  const inactive = total - active;
  return { total, active, inactive };
};

module.exports = { getAll, getById, create, update, remove, getStats };
