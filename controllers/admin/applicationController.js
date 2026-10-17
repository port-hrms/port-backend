// @ts-nocheck
// server/controllers/applicationController.js


const fs                 = require("fs");
const applicationService = require("../../services/recruitment/applicationService");
const { sendSuccess, sendError, sendNotFound, sendBadRequest } = require("../../utils/responseHandler");

const submitApplication = async (req, res) => {
  try {
    const result = await applicationService.submitApplication(req.body, req.file);
    return sendSuccess(
      res,
      result,
      `Application submitted successfully! We'll be in touch, ${result.firstName} 🎉`,
      201
    );
  } catch (error) {
    if (error.code === 11000) {
      return sendBadRequest(res, "You have already applied for this job with this email address");
    }
    return sendError(res, error.message, error.statusCode || 400, error.message);
  }
};

const getApplications = async (req, res) => {
  try {
    const applications = await applicationService.getAllApplications(req.query);
    return sendSuccess(res, applications);
  } catch (error) {
    return sendError(res, "Error fetching applications", 500, error.message);
  }
};


const getApplicationById = async (req, res) => {
  try {
    const application = await applicationService.getApplicationById(req.params.id);
    return sendSuccess(res, application);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500, error.message);
  }
};

const updateApplication = async (req, res) => {
  try {
    const application = await applicationService.updateApplication(req.params.id, req.body);
    return sendSuccess(res, application, "Application updated");
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 400, error.message);
  }
};

const downloadResume = async (req, res) => {
  try {
    const { path: resumePath, originalName } = await applicationService.getResumeFile(req.params.id);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${originalName}"`);

    // Stream the file — controller handles HTTP streaming (not the service)
    fs.createReadStream(resumePath).pipe(res);
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500, error.message);
  }
};

const deleteApplication = async (req, res) => {
  try {
    await applicationService.deleteApplication(req.params.id);
    return sendSuccess(res, {}, "Application and resume deleted");
  } catch (error) {
    return sendError(res, error.message, error.statusCode || 500, error.message);
  }
};

module.exports = {
  submitApplication,
  getApplications,
  getApplicationById,
  updateApplication,
  downloadResume,
  deleteApplication,
};