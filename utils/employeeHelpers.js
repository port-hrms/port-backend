// @ts-nocheck

const normalizeEmail = (email) => email?.toLowerCase()?.trim();

// Multipart forms send booleans as strings — "false" must not count as true
const toBool = (value) => value === true || value === "true" || value === "1" || value === 1;

// Treat search text literally — characters like ( * + ? are not regex syntax here
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Removed (soft-deleted) employees are hidden everywhere by default
const NOT_DELETED = { is_deleted: { $ne: true } };

const buildEmployeeFilter = ({ search, department, status, employmentType }) => {
  const filter = { ...NOT_DELETED };

  if (employmentType && employmentType !== "All") {
    filter.employmentType = employmentType;
  }

  if (department && department !== "All") {
    filter.department = department;
  }

  if (status && status !== "All") {
    filter.status = status;
  }

  const term = typeof search === "string" ? search.trim().slice(0, 100) : "";
  if (term) {
    const pattern = escapeRegex(term);
    filter.$or = [
      { firstName: { $regex: pattern, $options: "i" } },
      { lastName: { $regex: pattern, $options: "i" } },
      { employeeId: { $regex: pattern, $options: "i" } },
      { email: { $regex: pattern, $options: "i" } },
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
    endingDate,
    status,
    salary,
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

  if (!gender) delete cleanData.gender; // "Select…" left empty
  if (dateOfBirth) cleanData.dateOfBirth = dateOfBirth;
  if (endingDate) cleanData.endingDate = endingDate;

  return cleanData;
};

// ─── Update allow-list ───────────────────────────────────────
// Only these fields can be changed through PUT /employees/:id.
// Anything else in the request body (employeeId, role, password, documents,
// is_deleted, …) is ignored.
const UPDATABLE_FIELDS = [
  "firstName", "lastName", "email", "phone", "dateOfBirth", "gender", "address",
  "aadharNumber", "department", "designation", "employmentType", "joiningDate",
  "endingDate", "status", "salary",
];
const BANK_FIELDS = ["bankName", "accountNumber", "ifscCode", "panNumber", "pfNumber", "pfUAN"];
const SENSITIVE_FIELDS = ["aadharNumber", "accountNumber", "panNumber"];
const DATE_FIELDS = ["dateOfBirth", "joiningDate", "endingDate"];

// Exact shapes produced by the masking below. A value in one of these shapes came from a
// masked view and must never overwrite the real number. (Real values can't match: Aadhaar
// and account numbers are digits only, and a real PAN has digits in positions 6–9.)
const MASK_PATTERNS = {
  aadharNumber: /^X{4} X{4} \d{4}$/,
  accountNumber: /^X+\d{0,4}$/,
  panNumber: /^[A-Z]{2}X{5}[0-9A-Z]{3}$|^X+[0-9A-Z]{0,3}$/,
};
const isMaskedValue = (field, value) =>
  typeof value === "string" && MASK_PATTERNS[field]?.test(value.trim().toUpperCase());

const buildUpdateEmployeeData = (body = {}) => {
  const update = {};

  UPDATABLE_FIELDS.forEach((field) => {
    if (body[field] === undefined) return;
    if (SENSITIVE_FIELDS.includes(field) && isMaskedValue(field, body[field])) return;
    if (field === "gender" && body[field] === "") return;
    // Empty date inputs clear the date instead of failing validation
    if (DATE_FIELDS.includes(field) && body[field] === "") {
      update[field] = null;
      return;
    }
    update[field] = body[field];
  });

  BANK_FIELDS.forEach((field) => {
    if (body[field] === undefined) return;
    if (SENSITIVE_FIELDS.includes(field) && isMaskedValue(field, body[field])) return;
    update[`bankInfo.${field}`] = body[field];
  });

  return update;
};

// ─── Masking ─────────────────────────────────────────────────
const maskTail = (value, visible = 4) => {
  if (!value) return value || "";
  const str = String(value).replace(/\s+/g, "");
  if (str.length <= visible) return "X".repeat(str.length);
  return "X".repeat(str.length - visible) + str.slice(-visible);
};

const maskAadhaar = (value) => {
  const masked = maskTail(value, 4);
  return masked ? masked.replace(/(.{4})(?=.)/g, "$1 ") : masked; // XXXX XXXX 1234
};

const maskPan = (value) => {
  if (!value) return value || "";
  const str = String(value).toUpperCase();
  return str.length === 10 ? `${str.slice(0, 2)}XXXXX${str.slice(7)}` : maskTail(str, 3);
};

// KYC is complete when identity + payout details are all on file
const isKycComplete = (employee) => {
  const b = employee?.bankInfo || {};
  return Boolean(employee?.aadharNumber && b.accountNumber && b.ifscCode && b.panNumber);
};

// Bank details needed to pay salary by bank transfer
const missingBankDetails = (employee) => {
  const b = employee?.bankInfo || {};
  return [
    !b.accountNumber && "account number",
    !b.ifscCode && "IFSC code",
  ].filter(Boolean);
};

// Strip auth leftovers and mask identity / bank numbers for API responses.
const toSafeEmployee = (employee) => {
  if (!employee) return employee;
  const obj = typeof employee.toObject === "function" ? employee.toObject() : { ...employee };
  delete obj.password;
  delete obj.role;
  obj.kycComplete = isKycComplete(obj);
  obj.aadharNumber = maskAadhaar(obj.aadharNumber);
  if (obj.bankInfo) {
    obj.bankInfo = {
      ...obj.bankInfo,
      accountNumber: maskTail(obj.bankInfo.accountNumber, 4),
      panNumber: maskPan(obj.bankInfo.panNumber),
    };
  }
  return obj;
};

module.exports = {
  NOT_DELETED,
  toBool,
  escapeRegex,
  normalizeEmail,
  buildEmployeeFilter,
  buildCreateEmployeeData,
  buildUpdateEmployeeData,
  isKycComplete,
  missingBankDetails,
  toSafeEmployee,
};
