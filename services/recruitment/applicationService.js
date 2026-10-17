// @ts-nocheck

const fs          = require("fs");
const Application = require("../../models/Application");
const Job         = require("../../models/Job");


const submitApplication = async (body, file) => {
  const {
    jobId, firstName, lastName, email, phone,
    currentLocation, experienceYears, currentCompany, coverLetter,
  } = body;

  // Validate required fields
  if (!jobId || !firstName || !lastName || !email || !phone) {
    const err = new Error("Job ID, name, email and phone are required");
    err.statusCode = 400;
    throw err;
  }

  // Validate file was uploaded
  if (!file) {
    const err = new Error("Please upload your resume (PDF only)");
    err.statusCode = 400;
    throw err;
  }

  // Check job exists and is active
  const job = await Job.findById(jobId);
  if (!job) {
    const err = new Error("Job not found");
    err.statusCode = 404;
    throw err;
  }
  if (job.status !== "Active") {
    const err = new Error("This job is no longer accepting applications");
    err.statusCode = 400;
    throw err;
  }

  // Create the application record
  const application = await Application.create({
    job:                jobId,
    firstName,
    lastName,
    email,
    phone,
    currentLocation:    currentLocation  || "",
    experienceYears:    experienceYears  || 0,
    currentCompany:     currentCompany   || "",
    coverLetter:        coverLetter      || "",
    resumePath:         file.path,
    resumeOriginalName: file.originalname,
    status:             "New",
  });

  // Increment the job's application count
  await Job.findByIdAndUpdate(jobId, { $inc: { applicationCount: 1 } });

  return {
    applicationId: application._id,
    jobTitle:      job.title,
    appliedAt:     application.appliedAt,
    firstName,
  };
};

const getAllApplications = async (filters = {}) => {
  const { status, jobId } = filters;

  const query = {};
  if (status && status !== "All") query.status = status;
  if (jobId)                      query.job    = jobId;

  return await Application.find(query)
    .populate("job", "title department location jobType")
    .sort({ appliedAt: -1 });
};

// ─────────────────────────────────────────────────────────────
// Get a single application by ID
// Called by: getApplicationById controller
// ─────────────────────────────────────────────────────────────
const getApplicationById = async (id) => {
  const application = await Application.findById(id)
    .populate("job", "title department location jobType description");

  if (!application) {
    const err = new Error("Application not found");
    err.statusCode = 404;
    throw err;
  }

  return application;
};


const updateApplication = async (id, updates) => {
  const { status, hrNotes } = updates;

  const application = await Application.findByIdAndUpdate(
    id,
    { status, hrNotes },
    { new: true, runValidators: true }
  ).populate("job", "title department");

  if (!application) {
    const err = new Error("Application not found");
    err.statusCode = 404;
    throw err;
  }

  return application;
};


const getResumeFile = async (id) => {
  const application = await Application.findById(id);

  if (!application) {
    const err = new Error("Application not found");
    err.statusCode = 404;
    throw err;
  }

  if (!fs.existsSync(application.resumePath)) {
    const err = new Error("Resume file not found on server");
    err.statusCode = 404;
    throw err;
  }

  return {
    path:         application.resumePath,
    originalName: application.resumeOriginalName || "resume.pdf",
  };
};

// ─────────────────────────────────────────────────────────────
// Delete application + resume file from disk
// Called by: deleteApplication controller
// ─────────────────────────────────────────────────────────────
const deleteApplication = async (id) => {
  const application = await Application.findByIdAndDelete(id);

  if (!application) {
    const err = new Error("Application not found");
    err.statusCode = 404;
    throw err;
  }

  // Clean up resume PDF from disk
  if (application.resumePath && fs.existsSync(application.resumePath)) {
    fs.unlinkSync(application.resumePath);
  }

  // Decrement job's application count
  await Job.findByIdAndUpdate(application.job, {
    $inc: { applicationCount: -1 },
  });
};

module.exports = {
  submitApplication,
  getAllApplications,
  getApplicationById,
  updateApplication,
  getResumeFile,
  deleteApplication,
};
