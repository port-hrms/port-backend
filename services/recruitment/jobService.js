// @ts-nocheck

const Job = require("../../models/Job");
const Application = require("../../models/Application");
const { buildPublicJobsFilter, buildAllJobsFilter, buildCreateJobPayload } = require("../../utils/jobHelpers");

const withStatus = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getPublicJobs = async (query) => {
  const filter = buildPublicJobsFilter(query || {});
  return Job.find(filter)
    .select("-postedBy")
    .sort({ createdAt: -1 });
};

const getPublicJobById = async (id) => {
  const job = await Job.findById(id).select("-postedBy");
  if (!job || job.status !== "Active") {
    throw withStatus("Job not found or no longer active", 404);
  }
  return job;
};

const getAllJobs = async (query) => {
  const filter = buildAllJobsFilter(query || {});
  return Job.find(filter)
    .populate("postedBy", "name email")
    .sort({ createdAt: -1 });
};

const createJob = async (payload, userId) => {
  const jobPayload = buildCreateJobPayload(payload, userId);
  return Job.create(jobPayload);
};

const updateJob = async (id, payload) => {
  const job = await Job.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
  if (!job) {
    throw withStatus("Job not found", 404);
  }
  return job;
};

const deleteJob = async (id) => {
  const job = await Job.findByIdAndDelete(id);
  if (!job) {
    throw withStatus("Job not found", 404);
  }

  await Application.deleteMany({ job: id });
  return job;
};

const getRecruitmentStats = async () => {
  const [
    totalJobs,
    activeJobs,
    closedJobs,
    totalApplications,
    newApplications,
    reviewedApplications,
  ] = await Promise.all([
    Job.countDocuments(),
    Job.countDocuments({ status: "Active" }),
    Job.countDocuments({ status: "Closed" }),
    Application.countDocuments(),
    Application.countDocuments({ status: "New" }),
    Application.countDocuments({ status: "Reviewed" }),
  ]);

  return {
    totalJobs,
    activeJobs,
    closedJobs,
    totalApplications,
    newApplications,
    reviewedApplications,
  };
};

module.exports = {
  getPublicJobs,
  getPublicJobById,
  getAllJobs,
  createJob,
  updateJob,
  deleteJob,
  getRecruitmentStats,
};
