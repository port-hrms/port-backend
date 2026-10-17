// @ts-nocheck

const parseInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const buildReviewsFilter = ({ reviewCycle, year, status, employeeId }, user) => {
  const filter = {};

  if (reviewCycle && reviewCycle !== "All") filter.reviewCycle = reviewCycle;

  const parsedYear = parseInteger(year);
  if (parsedYear) filter.year = parsedYear;

  if (status && status !== "All") filter.status = status;

  if (user?.role === "employee") {
    if (!user.employee) return null;
    filter.employee = user.employee;
  } else if (employeeId) {
    filter.employee = employeeId;
  }

  return filter;
};

const buildCreateReviewPayload = (payload) => {
  const {
    employee,
    reviewCycle,
    year,
    reviewerName,
    kpis,
    technicalSkills,
    communication,
    teamwork,
    leadership,
    punctuality,
    problemSolving,
    strengths,
    areasOfImprovement,
    goals,
    managerComments,
    employeeComments,
    incrementRecommended,
    incrementPercent,
    promotionRecommended,
    status,
  } = payload;

  return {
    employee,
    reviewCycle,
    year: parseInteger(year),
    reviewerName: reviewerName || "HR Admin",
    kpis: kpis || [],
    technicalSkills: technicalSkills || 3,
    communication: communication || 3,
    teamwork: teamwork || 3,
    leadership: leadership || 3,
    punctuality: punctuality || 3,
    problemSolving: problemSolving || 3,
    strengths: strengths || "",
    areasOfImprovement: areasOfImprovement || "",
    goals: goals || "",
    managerComments: managerComments || "",
    employeeComments: employeeComments || "",
    incrementRecommended: incrementRecommended || false,
    incrementPercent: incrementPercent || 0,
    promotionRecommended: promotionRecommended || false,
    status: status || "Submitted",
  };
};

const buildGradeCount = (reviews) => ({
  Excellent: reviews.filter((review) => review.grade === "Excellent").length,
  Good: reviews.filter((review) => review.grade === "Good").length,
  Average: reviews.filter((review) => review.grade === "Average").length,
  "Needs Improvement": reviews.filter((review) => review.grade === "Needs Improvement").length,
  Poor: reviews.filter((review) => review.grade === "Poor").length,
});

module.exports = {
  parseInteger,
  buildReviewsFilter,
  buildCreateReviewPayload,
  buildGradeCount,
};
