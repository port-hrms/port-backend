const Quotation = require("../../models/Quotation");
const Client = require("../../models/Client");

const getAll = async (query = {}) => {
  const filter = { is_deleted: false };
  if (query.search) {
    const regex = new RegExp(query.search, "i");
    const clients = await Client.find({ is_deleted: false, $or: [{ name: regex }, { companyName: regex }] }).select("_id");
    const clientIds = clients.map((c) => c._id);
    filter.$or = [{ quotationNumber: regex }, { clientId: { $in: clientIds } }];
  }
  if (query.status) filter.status = query.status;
  if (query.clientId) filter.clientId = query.clientId;

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 50;
  const skip = (page - 1) * limit;

  const [quotations, total] = await Promise.all([
    Quotation.find(filter)
      .populate("clientId", "name companyName email phone address gstNumber")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Quotation.countDocuments(filter),
  ]);

  return { quotations, total, page, limit, pages: Math.ceil(total / limit) };
};

const getById = async (id) => {
  const quotation = await Quotation.findOne({ _id: id, is_deleted: false }).populate(
    "clientId",
    "name companyName email phone address gstNumber"
  );
  if (!quotation) throw Object.assign(new Error("Quotation not found"), { statusCode: 404 });
  return quotation;
};

const create = async (data) => {
  const items = (data.items || []).filter(item => item.service);
  const subtotal = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.price || 0), 0);
  const tax = data.tax || Math.round(subtotal * 0.18);
  const discount = data.discount || 0;
  const total = subtotal + tax - discount;

  const quotation = await Quotation.create({
    ...data,
    items,
    subtotal,
    tax,
    total,
  });
  return quotation;
};

const update = async (id, data) => {
  if (data.items) {
    data.items = (data.items || []).filter(item => item.service);
    const subtotal = data.items.reduce((sum, item) => sum + (item.quantity || 0) * (item.price || 0), 0);
    const tax = data.tax || Math.round(subtotal * 0.18);
    const discount = data.discount ?? 0;
    data.subtotal = subtotal;
    data.tax = tax;
    data.total = subtotal + tax - discount;
  }

  const quotation = await Quotation.findOneAndUpdate(
    { _id: id, is_deleted: false },
    data,
    { new: true, runValidators: true }
  );
  if (!quotation) throw Object.assign(new Error("Quotation not found"), { statusCode: 404 });
  return quotation;
};

const remove = async (id) => {
  const quotation = await Quotation.findOneAndUpdate(
    { _id: id, is_deleted: false },
    { is_deleted: true },
    { new: true }
  );
  if (!quotation) throw Object.assign(new Error("Quotation not found"), { statusCode: 404 });
  return quotation;
};

const updateStatus = async (id, status) => {
  const quotation = await Quotation.findOneAndUpdate(
    { _id: id, is_deleted: false },
    { status },
    { new: true }
  );
  if (!quotation) throw Object.assign(new Error("Quotation not found"), { statusCode: 404 });
  return quotation;
};

const getStats = async () => {
  const filter = { is_deleted: false };
  const total = await Quotation.countDocuments(filter);
  const pending = await Quotation.countDocuments({ ...filter, status: "Pending" });
  const approved = await Quotation.countDocuments({ ...filter, status: "Approved" });
  const rejected = await Quotation.countDocuments({ ...filter, status: "Rejected" });

  const revenueResult = await Quotation.aggregate([
    { $match: { is_deleted: false, status: "Approved" } },
    { $group: { _id: null, total: { $sum: "$total" } } },
  ]);
  const revenueEstimate = revenueResult.length > 0 ? revenueResult[0].total : 0;

  return { total, pending, approved, rejected, revenueEstimate };
};

module.exports = { getAll, getById, create, update, remove, updateStatus, getStats };
