const quotationService = require("../../services/quotation/quotationService");
const { sendSuccess, sendError, sendNotFound } = require("../../utils/responseHandler");
const { generateQuotationPDF } = require("../../utils/pdfGenerator");
const emailService = require("../../services/emailService");
const Client = require("../../models/Client");
const CompanySetting = require("../../models/CompanySetting");

const getAll = async (req, res) => {
  try {
    const result = await quotationService.getAll(req.query);
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const getById = async (req, res) => {
  try {
    const quotation = await quotationService.getById(req.params.id);
    return sendSuccess(res, quotation);
  } catch (error) {
    if (error.statusCode === 404) return sendNotFound(res, "Quotation");
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const create = async (req, res) => {
  try {
    const quotation = await quotationService.create(req.body);
    return sendSuccess(res, quotation, "Quotation created successfully", 201);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const update = async (req, res) => {
  try {
    const quotation = await quotationService.update(req.params.id, req.body);
    return sendSuccess(res, quotation, "Quotation updated successfully");
  } catch (error) {
    if (error.statusCode === 404) return sendNotFound(res, "Quotation");
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const remove = async (req, res) => {
  try {
    await quotationService.remove(req.params.id);
    return sendSuccess(res, null, "Quotation deleted successfully");
  } catch (error) {
    if (error.statusCode === 404) return sendNotFound(res, "Quotation");
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const updateStatus = async (req, res) => {
  try {
    const quotation = await quotationService.updateStatus(req.params.id, req.body.status);
    return sendSuccess(res, quotation, `Quotation ${req.body.status.toLowerCase()} successfully`);
  } catch (error) {
    if (error.statusCode === 404) return sendNotFound(res, "Quotation");
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const generatePDF = async (req, res) => {
  try {
    const quotation = await quotationService.getById(req.params.id);
    const companySettings = await CompanySetting.findOne();
    const pdfBuffer = generateQuotationPDF(quotation, companySettings);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=quotation-${quotation.quotationNumber}.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const sendEmail = async (req, res) => {
  try {
    const quotation = await quotationService.getById(req.params.id);
    const client = quotation.clientId;
    const companySettings = await CompanySetting.findOne();

    const pdfBuffer = generateQuotationPDF(quotation, companySettings);
    const base64PDF = pdfBuffer.toString("base64");

    await emailService.sendQuotationEmail({
      to: client.email,
      subject: `Quotation ${quotation.quotationNumber} from ${(companySettings && companySettings.name) || process.env.COMPANY_NAME || "Company"}`,
      text: `Dear ${client.name},\n\nPlease find attached the quotation ${quotation.quotationNumber} for your requested services.\n\nTotal Amount: ₹${quotation.total.toLocaleString("en-IN")}\nValid Till: ${new Date(quotation.validTill).toLocaleDateString("en-IN")}\n\nRegards,\n${(companySettings && companySettings.name) || process.env.COMPANY_NAME || "Company"}`,
      pdfBuffer: base64PDF,
      filename: `quotation-${quotation.quotationNumber}.pdf`,
    });

    return sendSuccess(res, null, "Quotation sent via email successfully");
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
};

const getStats = async (req, res) => {
  try {
    const stats = await quotationService.getStats();
    return sendSuccess(res, stats);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500);
  }
};

module.exports = { getAll, getById, create, update, remove, updateStatus, generatePDF, sendEmail, getStats };
