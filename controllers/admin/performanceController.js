// @ts-nocheck

const performanceService = require("../../services/performanceService");

const resolveStatusCode = (error, fallback = 500) => error?.statusCode || fallback;

const getReviews = async (req, res) => {
  try {
    const { reviews, count } = await performanceService.getReviews(req.query, req.user);

    return res.status(200).json({
      success: true,
      count,
      data: reviews,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error, 500)).json({
      success: false,
      message: "Error fetching performance reviews",
      error: error.message,
    });
  }
};

const getReviewById = async (req, res) => {
  try {
    const review = await performanceService.getReviewById(req.params.id);
    return res.status(200).json({ success: true, data: review });
  } catch (error) {
    return res.status(resolveStatusCode(error, 500)).json({
      success: false,
      message: "Error fetching review",
      error: error.message,
    });
  }
};

const createReview = async (req, res) => {
  try {
    const { review, message } = await performanceService.createReview(req.body);
    return res.status(201).json({
      success: true,
      message,
      data: review,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A review for this employee and cycle already exists",
      });
    }

    return res.status(resolveStatusCode(error, 400)).json({
      success: false,
      message: "Error creating review",
      error: error.message,
    });
  }
};

const updateReview = async (req, res) => {
  try {
    const review = await performanceService.updateReview(req.params.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Performance review updated successfully",
      data: review,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error, 400)).json({
      success: false,
      message: "Error updating review",
      error: error.message,
    });
  }
};

const deleteReview = async (req, res) => {
  try {
    await performanceService.deleteReview(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Performance review deleted",
      data: {},
    });
  } catch (error) {
    return res.status(resolveStatusCode(error, 500)).json({
      success: false,
      message: "Error deleting review",
      error: error.message,
    });
  }
};

const getPerformanceStats = async (req, res) => {
  try {
    const stats = await performanceService.getPerformanceStats(req.query);
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error, 500)).json({
      success: false,
      message: "Error fetching performance stats",
      error: error.message,
    });
  }
};

module.exports = {
  getReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  getPerformanceStats,
};
