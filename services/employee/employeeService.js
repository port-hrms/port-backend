// @ts-nocheck

const Employee = require("../../models/Employee");
const User = require("../../models/User");
const { normalizeEmail, buildEmployeeFilter, buildCreateEmployeeData } = require("../../utils/employeeHelpers");

const withStatus = (message, statusCode, publicMessage) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (publicMessage) error.publicMessage = publicMessage;
  return error;
};

const getAllEmployees = async (query) => {
  const filter = buildEmployeeFilter(query || {});
  return Employee.find(filter).sort({ createdAt: -1 });
};

const getEmployeeById = async (id) => {
  const employee = await Employee.findById(id);
  if (!employee) {
    throw withStatus(`Employee with ID ${id} not found`, 404);
  }
  return employee;
};

const createEmployee = async (payload) => {
  const {
    firstName,
    lastName,
    email,
    createLogin,
    loginPassword,
  } = payload;

  const normalizedEmail = normalizeEmail(email);

  const existingEmployee = await Employee.findOne({ email: normalizedEmail });
  if (existingEmployee) {
    throw withStatus("An employee with this email already exists", 400);
  }

  if (createLogin) {
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw withStatus("A user account with this email already exists", 400);
    }
  }

  const cleanData = buildCreateEmployeeData(payload, normalizedEmail);
  const employee = await Employee.create(cleanData);

  let loginCreated = false;
  if (createLogin) {
    try {
      await User.create({
        name: `${firstName} ${lastName}`.trim(),
        email: normalizedEmail,
        password: loginPassword,
        role: "employee",
        employee: employee._id,
      });
      loginCreated = true;
    } catch (userError) {
      await Employee.findByIdAndDelete(employee._id);
      throw withStatus(userError.message, 400, "Employee was not created because login account creation failed");
    }
  }

  return {
    employee,
    loginCreated,
    message: loginCreated
      ? `Employee ${firstName} ${lastName} and login account created successfully`
      : `Employee ${firstName} ${lastName} created successfully`,
  };
};

const updateEmployee = async (id, payload) => {
  const existingEmployee = await Employee.findById(id);
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
  }

  const updatedEmployee = await Employee.findByIdAndUpdate(
    id,
    normalizedPayload,
    { new: true, runValidators: true }
  );

  return updatedEmployee;
};

const deleteEmployee = async (id) => {
  const employee = await Employee.findByIdAndDelete(id);
  if (!employee) {
    throw withStatus(`Employee with ID ${id} not found`, 404);
  }
  return employee;
};

const getEmployeeStats = async () => {
  const [total, active, onLeave, inactive, byDepartment] = await Promise.all([
    Employee.countDocuments(),
    Employee.countDocuments({ status: "Active" }),
    Employee.countDocuments({ status: "On Leave" }),
    Employee.countDocuments({ status: "Inactive" }),
    Employee.aggregate([
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  return { total, active, onLeave, inactive, byDepartment };
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeStats,
};
