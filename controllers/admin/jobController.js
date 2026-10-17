// @ts-nocheck
const jobService = require("../../services/recruitment/jobService");
const resolveStatusCode = (error, fallback = 500) => error?.statusCode || fallback;

const getPublicJobs = async (req, res) => {
    try {
        const jobs = await jobService.getPublicJobs(req.query);
        return res.status(200).json({
            success: true,
            count: jobs.length,
            data: jobs,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching jobs",
            error: error.message,
        });
    }
};

const getPublicJobById = async (req, res) => {
    try {
        const job = await jobService.getPublicJobById(req.params.id);
        return res.status(200).json({ success: true, data: job });
    } catch (error) {
        return res.status(resolveStatusCode(error, 500)).json({
            success: false,
            message: "Error fetching job",
            error: error.message,
        });
    }
};

const getAllJobs = async (req, res) => {
    try {
        const jobs = await jobService.getAllJobs(req.query);
        return res.status(200).json({
            success: true,
            count: jobs.length,
            data: jobs,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching jobs",
            error: error.message,
        });
    }
};

const createJob = async (req, res) => {
    try {
        const job = await jobService.createJob(req.body, req.user._id);
        return res.status(201).json({
            success: true,
            message: `Job "${job.title}" posted successfully!`,
            data: job,
        });
    } catch (error) {
        return res.status(resolveStatusCode(error, 400)).json({
            success: false,
            message: "Error creating job",
            error: error.message,
        });
    }
};

const updateJob = async (req, res) => {
    try {
        const job = await jobService.updateJob(req.params.id, req.body);
        return res.status(200).json({
            success: true,
            message: "Job updated successfully",
            data: job,
        });
    } catch (error) {
        return res.status(resolveStatusCode(error, 400)).json({
            success: false,
            message: "Error updating job",
            error: error.message,
        });
    }
};

const deleteJob = async (req, res) => {
    try {
        const job = await jobService.deleteJob(req.params.id);
        return res.status(200).json({
            success: true,
            message: `Job "${job.title}" deleted along with all applications`,
            data: {},
        });
    } catch (error) {
        return res.status(resolveStatusCode(error, 500)).json({
            success: false,
            message: "Error deleting job",
            error: error.message,
        });
    }
};

const getRecruitmentStats = async (req, res) => {
    try {
        const stats = await jobService.getRecruitmentStats();
        return res.status(200).json({
            success: true,
            data: stats,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching stats",
            error: error.message,
        });
    }
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