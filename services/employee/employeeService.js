// @ts-nocheck

const Employee = require("../../models/Employee");
const User = require("../../models/User");
const crypto = require("crypto");
const { NOT_DELETED, toBool, normalizeEmail, buildEmployeeFilter, buildCreateEmployeeData } = require("../../utils/employeeHelpers");

const withStatus = (message, statusCode, publicMessage) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (publicMessage) error.publicMessage = publicMessage;
  return error;
};

// Phone / Aadhaar must be unique among current (not removed) employees
const assertNoDuplicateIdentity = async ({ phone, aadharNumber }, excludeId) => {
  const notSelf = excludeId ? { _id: { $ne: excludeId } } : {};
  if (phone) {
    const clash = await Employee.findOne({ ...NOT_DELETED, ...notSelf, phone: String(phone).trim() }).select("employeeId");
    if (clash) throw withStatus(`This phone number is already used by employee ${clash.employeeId}`, 400);
  }
  if (aadharNumber) {
    const clash = await Employee.findOne({ ...NOT_DELETED, ...notSelf, aadharNumber: String(aadharNumber).trim() }).select("employeeId");
    if (clash) throw withStatus(`This Aadhaar number is already registered to employee ${clash.employeeId}`, 400);
  }
};

const INVITE_TTL_MINUTES = 3 * 24 * 60; // invite links last 3 days

// Creates a password-setup token for the user. Returns the raw token to email.
const issueInviteToken = async (user) => {
  const rawToken = user.getResetPasswordToken(INVITE_TTL_MINUTES);
  await user.save({ validateBeforeSave: false });
  return rawToken;
};

const isDuplicateEmployeeId = (error) => error?.code === 11000 && error?.keyPattern?.employeeId;

const SORTABLE_FIELDS = {
  name: ["firstName", "lastName"],
  employeeId: ["employeeId"],
  department: ["department"],
  designation: ["designation"],
  status: ["status"],
  joiningDate: ["joiningDate"],
  createdAt: ["createdAt"],
};

const buildSort = (sortBy, order) => {
  const dir = order === "asc" ? 1 : -1;
  const fields = SORTABLE_FIELDS[sortBy] || SORTABLE_FIELDS.createdAt;
  const sort = {};
  fields.forEach((f) => { sort[f] = dir; });
  sort._id = dir; // stable order across pages
  return sort;
};

// Without `page` → full list (used by many screens). With `page` → one page + totals.
const getAllEmployees = async (query = {}) => {
  const filter = buildEmployeeFilter(query);
  const sort = buildSort(query.sortBy, query.order);
  // Compare the number inside IDs as a number, so EMP999 sorts before EMP1000
  const collation = query.sortBy === "employeeId" ? { locale: "en", numericOrdering: true } : undefined;
  const findSorted = () => {
    const q = Employee.find(filter).sort(sort);
    return collation ? q.collation(collation) : q;
  };

  if (query.page === undefined) {
    return findSorted();
  }

  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  const total = await Employee.countDocuments(filter);
  const pages = Math.max(Math.ceil(total / limit), 1);
  const page = Math.min(Math.max(parseInt(query.page, 10) || 1, 1), pages);
  const items = await findSorted().skip((page - 1) * limit).limit(limit);

  return { items, total, page, pages, limit };
};

const getEmployeeById = async (id) => {
  const employee = await Employee.findOne({ _id: id, ...NOT_DELETED });
  if (!employee) {
    throw withStatus(`Employee with ID ${id} not found`, 404);
  }
  return employee;
};

const createEmployee = async (payload) => {
  const { firstName, lastName, email, loginPassword } = payload;
  const createLogin = toBool(payload.createLogin);
  const useInvite = createLogin && payload.loginMode !== "password";

  const normalizedEmail = normalizeEmail(email);

  const existingEmployee = await Employee.findOne({ email: normalizedEmail });
  if (existingEmployee) {
    throw withStatus(
      existingEmployee.is_deleted
        ? "This email belongs to a removed employee. Use a different email."
        : "An employee with this email already exists",
      400
    );
  }

  if (createLogin) {
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw withStatus("A user account with this email already exists", 400);
    }
  }

  await assertNoDuplicateIdentity(payload);

  const cleanData = buildCreateEmployeeData(payload, normalizedEmail);

  // Two employees created at the same moment can compute the same next ID — retry with a fresh one
  let employee;
  for (let attempt = 1; ; attempt++) {
    try {
      employee = await Employee.create(cleanData);
      break;
    } catch (error) {
      if (!isDuplicateEmployeeId(error) || attempt >= 3) throw error;
    }
  }

  let loginCreated = false;
  let inviteToken = null;
  if (createLogin) {
    try {
      const user = await User.create({
        name: `${firstName} ${lastName}`.trim(),
        email: normalizedEmail,
        // Invite: a random password nobody knows; the employee sets their own via the emailed link
        password: useInvite ? crypto.randomBytes(24).toString("hex") : loginPassword,
        role: "employee",
        employee: employee._id,
      });
      if (useInvite) inviteToken = await issueInviteToken(user);
      loginCreated = true;
    } catch (userError) {
      await Employee.findByIdAndDelete(employee._id);
      throw withStatus(userError.message, 400, "Employee was not created because login account creation failed");
    }
  }

  return {
    employee,
    loginCreated,
    inviteToken,
    message: loginCreated
      ? `Employee ${firstName} ${lastName} and login account created successfully`
      : `Employee ${firstName} ${lastName} created successfully`,
  };
};

// (Re)send a password-setup invite. Creates the login first if the employee has none
// (e.g. imported from CSV, or added without login access).
const prepareInvite = async (id) => {
  const employee = await Employee.findOne({ _id: id, ...NOT_DELETED });
  if (!employee) throw withStatus(`Employee with ID ${id} not found`, 404);
  if (employee.status === "Inactive") {
    throw withStatus("This employee is inactive. Set them to Active before sending an invite.", 400);
  }

  let user = await User.findOne({ employee: employee._id });
  let created = false;
  if (!user) {
    const emailUsed = await User.findOne({ email: employee.email });
    if (emailUsed) throw withStatus("Another login account already uses this employee's email", 400);
    user = await User.create({
      name: `${employee.firstName} ${employee.lastName}`.trim(),
      email: employee.email,
      password: crypto.randomBytes(24).toString("hex"),
      role: "employee",
      employee: employee._id,
    });
    created = true;
  } else if (!user.isActive) {
    throw withStatus("This employee's login is disabled", 400);
  }

  const rawToken = await issueInviteToken(user);
  return { employee, user, rawToken, created };
};

const updateEmployee = async (id, payload) => {
  const existingEmployee = await Employee.findOne({ _id: id, ...NOT_DELETED });
  if (!existingEmployee) {
    throw withStatus(`Employee with ID ${id} not found`, 404);
  }

  const normalizedPayload = { ...payload };
  if (normalizedPayload.email) {
    normalizedPayload.email = normalizeEmail(normalizedPayload.email);
  }

  if (normalizedPayload.email && normalizedPayload.email !== existingEmployee.email) {
    const emailTaken = await Employee.findOne({
      email: normalizedPayload.email,
      _id: { $ne: id },
    });

    if (emailTaken) {
      throw withStatus("This email is already used by another employee", 400);
    }

    // The login account must move to the new email too — make sure no other login uses it
    const loginTaken = await User.findOne({
      email: normalizedPayload.email,
      employee: { $ne: existingEmployee._id },
    });
    if (loginTaken) {
      throw withStatus("This email is already used by another login account", 400);
    }
  }

  await assertNoDuplicateIdentity(
    {
      phone: normalizedPayload.phone !== existingEmployee.phone ? normalizedPayload.phone : undefined,
      aadharNumber: normalizedPayload.aadharNumber !== existingEmployee.aadharNumber ? normalizedPayload.aadharNumber : undefined,
    },
    existingEmployee._id
  );

  const updatedEmployee = await Employee.findByIdAndUpdate(
    id,
    normalizedPayload,
    { new: true, runValidators: true }
  );

  // Keep the linked login in sync (email used to sign in, display name)
  const userUpdate = {};
  if (updatedEmployee.email !== existingEmployee.email) userUpdate.email = updatedEmployee.email;
  const fullName = `${updatedEmployee.firstName} ${updatedEmployee.lastName}`.trim();
  if (fullName !== `${existingEmployee.firstName} ${existingEmployee.lastName}`.trim()) userUpdate.name = fullName;
  if (Object.keys(userUpdate).length > 0) {
    await User.updateMany({ employee: existingEmployee._id }, { $set: userUpdate });
  }

  return { updatedEmployee, previousDocuments: existingEmployee.documents?.toObject?.() || existingEmployee.documents || {} };
};

// Soft delete: the employee is hidden and marked Inactive, their login is disabled,
// and attendance / payroll / leave history is kept intact.
const deleteEmployee = async (id) => {
  const employee = await Employee.findOne({ _id: id, ...NOT_DELETED });
  if (!employee) {
    throw withStatus(`Employee with ID ${id} not found`, 404);
  }

  employee.is_deleted = true;
  employee.status = "Inactive";
  if (!employee.endingDate) employee.endingDate = new Date();
  await employee.save({ validateBeforeSave: false });

  await User.updateMany({ employee: employee._id }, { $set: { isActive: false } });

  return employee;
};

const getEmployeeStats = async () => {
  const [total, active, onLeave, inactive, byDepartment] = await Promise.all([
    Employee.countDocuments(NOT_DELETED),
    Employee.countDocuments({ ...NOT_DELETED, status: "Active" }),
    Employee.countDocuments({ ...NOT_DELETED, status: "On Leave" }),
    Employee.countDocuments({ ...NOT_DELETED, status: "Inactive" }),
    Employee.aggregate([
      { $match: NOT_DELETED },
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  return { total, active, onLeave, inactive, byDepartment };
};

module.exports = {
  prepareInvite,
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeStats,
};
