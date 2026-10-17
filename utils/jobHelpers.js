// @ts-nocheck

const buildPublicJobsFilter = ({ department, jobType, search }) => {
  const filter = { status: "Active" };

  if (department && department !== "All") filter.department = department;
  if (jobType && jobType !== "All") filter.jobType = jobType;

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { department: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  return filter;
};

const buildAllJobsFilter = ({ status, department }) => {
  const filter = {};
  if (status && status !== "All") filter.status = status;
  if (department && department !== "All") filter.department = department;
  return filter;
};

const buildCreateJobPayload = (payload, userId) => {
  const {
    title,
    department,
    location,
    jobType,
    experienceLevel,
    salaryMin,
    salaryMax,
    description,
    requirements,
    responsibilities,
    status,
    deadline,
  } = payload;

  return {
    title,
    department,
    location,
    jobType: jobType || "Full-Time",
    experienceLevel: experienceLevel || "Fresher",
    salaryMin: salaryMin || 0,
    salaryMax: salaryMax || 0,
    description,
    requirements: requirements || "",
    responsibilities: responsibilities || "",
    status: status || "Active",
    deadline: deadline || null,
    postedBy: userId,
  };
};

module.exports = {
  buildPublicJobsFilter,
  buildAllJobsFilter,
  buildCreateJobPayload,
};
