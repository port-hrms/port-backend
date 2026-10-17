const Invoice = require("../../models/Invoice");
const Quotation = require("../../models/Quotation");
const Client = require("../../models/Client");

const getAll = async (query = {}) => {
  const filter = { is_deleted: false };
  if (query.search) {
    const regex = new RegExp(query.search, "i");
    const clients = await Client.find({ is_deleted: false, $or: [{ name: regex }, { companyName: regex }] }).select("_id");
    const clientIds = clients.map((c) => c._id);
    filter.$or = [{ invoiceNumber: regex }, { clientId: { $in: clientIds } }];
  }
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
  if (query.clientId) filter.clientId = query.clientId;

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 50;
  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .populate("clientId", "name companyName email phone address gstNumber")
      .populate("quotationId", "quotationNumber")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Invoice.countDocuments(filter),
  ]);

  return { invoices, total, page, limit, pages: Math.ceil(total / limit) };
};

const getById = async (id) => {
  const invoice = await Invoice.findOne({ _id: id, is_deleted: false })
    .populate("clientId", "name companyName email phone address gstNumber")
    .populate("quotationId", "quotationNumber items subtotal tax discount total");
  if (!invoice) throw Object.assign(new Error("Invoice not found"), { statusCode: 404 });
  return invoice;
};

const create = async (data) => {
  if (data.items) {
    const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const tax = data.tax || Math.round(subtotal * 0.18);
    const discount = data.discount ?? 0;
    data.subtotal = subtotal;
    data.tax = tax;
    data.amount = subtotal + tax - discount;
  }

  const invoice = await Invoice.create(data);
  return invoice;
};

const createFromQuotation = async (quotationId, dueDate) => {
  const quotation = await Quotation.findOne({ _id: quotationId, is_deleted: false });
  if (!quotation) throw Object.assign(new Error("Quotation not found"), { statusCode: 404 });
  if (quotation.status !== "Approved") {
    throw Object.assign(new Error("Only approved quotations can be converted to invoices"), { statusCode: 400 });
  }

  const tax = quotation.tax || Math.round(quotation.subtotal * 0.18);
  const invoiceData = {
    quotationId: quotation._id,
    clientId: quotation.clientId,
    items: quotation.items,
    subtotal: quotation.subtotal,
    tax: tax,
    discount: quotation.discount,
    amount: quotation.subtotal + tax - quotation.discount,
    dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    paymentStatus: "Unpaid",
  };

  const invoice = await Invoice.create(invoiceData);
  return invoice;
};

const update = async (id, data) => {
  if (data.items) {
    const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const tax = data.tax || Math.round(subtotal * 0.18);
    const discount = data.discount ?? 0;
    data.subtotal = subtotal;
    data.tax = tax;
    data.amount = subtotal + tax - discount;
  }

  const invoice = await Invoice.findOneAndUpdate(
    { _id: id, is_deleted: false },
    data,
    { new: true, runValidators: true }
  );
  if (!invoice) throw Object.assign(new Error("Invoice not found"), { statusCode: 404 });
  return invoice;
};

const remove = async (id) => {
  const invoice = await Invoice.findOneAndUpdate(
    { _id: id, is_deleted: false },
    { is_deleted: true },
    { new: true }
  );
  if (!invoice) throw Object.assign(new Error("Invoice not found"), { statusCode: 404 });
  return invoice;
};

const updatePaymentStatus = async (id, { paymentStatus, transactionId, paymentDate }) => {
  const updateData = { paymentStatus };
  if (transactionId) updateData.transactionId = transactionId;
  if (paymentDate) updateData.paymentDate = paymentDate;

  const invoice = await Invoice.findOneAndUpdate(
    { _id: id, is_deleted: false },
    updateData,
    { new: true }
  );
  if (!invoice) throw Object.assign(new Error("Invoice not found"), { statusCode: 404 });
  return invoice;
};

const getStats = async () => {
  const filter = { is_deleted: false };
  const total = await Invoice.countDocuments(filter);
  const paid = await Invoice.countDocuments({ ...filter, paymentStatus: "Paid" });
  const unpaid = await Invoice.countDocuments({ ...filter, paymentStatus: "Unpaid" });
  const partial = await Invoice.countDocuments({ ...filter, paymentStatus: "Partial" });
  const overdue = await Invoice.countDocuments({ ...filter, paymentStatus: "Overdue" });

  const revenueResult = await Invoice.aggregate([
    { $match: { is_deleted: false, paymentStatus: "Paid" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const revenueGenerated = revenueResult.length > 0 ? revenueResult[0].total : 0;

  const pendingAmountResult = await Invoice.aggregate([
    { $match: { is_deleted: false, paymentStatus: { $in: ["Unpaid", "Partial", "Overdue"] } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const pendingPayments = pendingAmountResult.length > 0 ? pendingAmountResult[0].total : 0;

  return { total, paid, unpaid, partial, overdue, revenueGenerated, pendingPayments };
};

module.exports = { getAll, getById, create, createFromQuotation, update, remove, updatePaymentStatus, getStats };
