// @ts-nocheck

const Performance = require("../models/Performance");
const Employee = require("../models/Employee");
const {
  parseInteger,
  buildReviewsFilter,
  buildCreateReviewPayload,
  buildGradeCount,
} = require("../utils/performanceHelpers");

const withStatus = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getReviews = async (query, user) => {
  const filter = buildReviewsFilter(query || {}, user);

  if (filter === null) {
    throw withStatus("Employee account is not linked to an employee profile", 400);
  }

  const reviews = await Performance.find(filter)
    .populate("employee", "firstName lastName employeeId department designation")
    .sort({ createdAt: -1 });

  return {
    reviews,
    count: reviews.length,
  };
};

const getReviewById = async (id) => {
  const review = await Performance.findById(id).populate(
    "employee",
    "firstName lastName employeeId department designation salary"
  );

  if (!review) {
    throw withStatus("Performance review not found", 404);
  }

  return review;
};

const createReview = async (payload) => {
  const employeeExists = await Employee.findById(payload.employee);

  if (!employeeExists) {
    throw withStatus("Employee not found", 404);
  }

  const parsedYear = parseInteger(payload.year);
  const existing = await Performance.findOne({
    employee: payload.employee,
    reviewCycle: payload.reviewCycle,
    year: parsedYear,
  });

  if (existing) {
    throw withStatus(
      `A ${payload.reviewCycle} review for ${employeeExists.firstName} already exists for ${payload.year}`,
      400
    );
  }

  const review = await Performance.create(buildCreateReviewPayload(payload));
  await review.populate("employee", "firstName lastName employeeId department designation");

  return {
    review,
    message: `Performance review created for ${employeeExists.firstName} ${employeeExists.lastName}`,
  };
};

const updateReview = async (id, payload) => {
  const review = await Performance.findById(id);

  if (!review) {
    throw withStatus("Performance review not found", 404);
  }

  Object.assign(review, payload);
  await review.save();
  await review.populate("employee", "firstName lastName employeeId department designation");

  return review;
};

const deleteReview = async (id) => {
  const review = await Performance.findByIdAndDelete(id);

  if (!review) {
    throw withStatus("Performance review not found", 404);
  }

  return true;
};

const getPerformanceStats = async (query) => {
  const year = parseInteger(query?.year) || new Date().getFullYear();

  const reviews = await Performance.find({ year });

  const avgScore =
    reviews.length > 0
      ? Math.round(reviews.reduce((sum, review) => sum + review.overallScore, 0) / reviews.length)
      : 0;

  const incrementCount = reviews.filter((review) => review.incrementRecommended).length;
  const promotionCount = reviews.filter((review) => review.promotionRecommended).length;

  const topPerformers = await Performance.find({ year, overallScore: { $gte: 85 } })
    .populate("employee", "firstName lastName employeeId department designation")
    .sort({ overallScore: -1 })
    .limit(5);

  return {
    totalReviews: reviews.length,
    avgScore,
    gradeCount: buildGradeCount(reviews),
    incrementCount,
    promotionCount,
    topPerformers,
  };
};

module.exports = {
  getReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
  getPerformanceStats,
};
