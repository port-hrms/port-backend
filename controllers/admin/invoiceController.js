const invoiceService = require("../../services/invoice/invoiceService");
const { sendSuccess, sendError, sendNotFound } = require("../../utils/responseHandler");
const { generateInvoicePDF } = require("../../utils/pdfGenerator");
const emailService = require("../../services/emailService");
const CompanySetting = require("../../models/CompanySetting");

const getAll = async (req, res) => {
  try {
    const result = await invoiceService.getAll(req.query);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const getById = async (req, res) => {
  try {
    const invoice = await invoiceService.getById(req.params.id);
    return sendSuccess(res, invoice);
  } catch (error) {
    if (error.statusCode === 404) return sendNotFound(res, "Invoice");
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const create = async (req, res) => {
  try {
    const invoice = await invoiceService.create(req.body);
    return sendSuccess(res, invoice, "Invoice created successfully", 201);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const createFromQuotation = async (req, res) => {
  try {
    const { quotationId, dueDate } = req.body;
    const invoice = await invoiceService.createFromQuotation(quotationId, dueDate);
    return sendSuccess(res, invoice, "Invoice generated from quotation successfully", 201);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const update = async (req, res) => {
  try {
    const invoice = await invoiceService.update(req.params.id, req.body);
    return sendSuccess(res, invoice, "Invoice updated successfully");
  } catch (error) {
    if (error.statusCode === 404) return sendNotFound(res, "Invoice");
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const remove = async (req, res) => {
  try {
    await invoiceService.remove(req.params.id);
    return sendSuccess(res, null, "Invoice deleted successfully");
  } catch (error) {
    if (error.statusCode === 404) return sendNotFound(res, "Invoice");
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const updatePaymentStatus = async (req, res) => {
  try {
    const invoice = await invoiceService.updatePaymentStatus(req.params.id, req.body);
    return sendSuccess(res, invoice, "Payment status updated successfully");
  } catch (error) {
    if (error.statusCode === 404) return sendNotFound(res, "Invoice");
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const generatePDF = async (req, res) => {
  try {
    const invoice = await invoiceService.getById(req.params.id);
    const companySettings = await CompanySetting.findOne();
    const pdfBuffer = generateInvoicePDF(invoice, companySettings);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const sendEmail = async (req, res) => {
  try {
    const invoice = await invoiceService.getById(req.params.id);
    const client = invoice.clientId;
    const companySettings = await CompanySetting.findOne();

    const pdfBuffer = generateInvoicePDF(invoice, companySettings);
    const base64PDF = pdfBuffer.toString("base64");

    await emailService.sendInvoiceEmail({
      to: client.email,
      subject: `Invoice ${invoice.invoiceNumber} from ${(companySettings && companySettings.name) || process.env.COMPANY_NAME || "Company"}`,
      text: `Dear ${client.name},\n\nPlease find attached the invoice ${invoice.invoiceNumber} for your reference.\n\nTotal Amount: ₹${invoice.amount.toLocaleString("en-IN")}\nDue Date: ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}\n\nRegards,\n${(companySettings && companySettings.name) || process.env.COMPANY_NAME || "Company"}`,
      pdfBuffer: base64PDF,
      filename: `invoice-${invoice.invoiceNumber}.pdf`,
    });

    return sendSuccess(res, null, "Invoice sent via email successfully");
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const getStats = async (req, res) => {
  try {
    const stats = await invoiceService.getStats();
    return sendSuccess(res, stats);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
};

module.exports = { getAll, getById, create, createFromQuotation, update, remove, updatePaymentStatus, generatePDF, sendEmail, getStats };
