// @ts-nocheck

const normalizeEmail = (email) => email?.toLowerCase()?.trim();

const buildEmployeeFilter = ({ search, department, status }) => {
  const filter = {};

  if (department && department !== "All") {
    filter.department = department;
  }

  if (status && status !== "All") {
    filter.status = status;
  }

  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { employeeId: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  return filter;
};

const buildCreateEmployeeData = (payload, normalizedEmail) => {
  const {
    firstName,
    lastName,
    phone,
    dateOfBirth,
    gender,
    address,
    department,
    designation,
    employmentType,
    joiningDate,
    status,
    salary,
    role,
    aadharNumber,
    bankName,
    accountNumber,
    ifscCode,
    panNumber,
    pfNumber,
    pfUAN,
  } = payload;

  const cleanData = {
    firstName,
    lastName,
    email: normalizedEmail,
    phone,
    gender,
    address,
    department,
    designation,
    employmentType,
    joiningDate,
    status,
    salary,
    role,
    aadharNumber,
    bankInfo: {
      bankName,
      accountNumber,
      ifscCode,
      panNumber,
      pfNumber,
      pfUAN,
    },
  };

  if (dateOfBirth) cleanData.dateOfBirth = dateOfBirth;

  return cleanData;
};

module.exports = {
  normalizeEmail,
  buildEmployeeFilter,
  buildCreateEmployeeData,
};
