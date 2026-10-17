// @ts-nocheck
const crypto = require("crypto");
const User = require("../../models/User");

const withStatus = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const registerUser = async ({ name, email, password, role, employee }) => {
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw withStatus("A user with this email already exists", 400);
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role || "hr",
    employee: employee || null,
  });

  return user;
};

const loginUser = async ({ email, password, role }) => {
  const user = await User.findOne({ email: email.toLowerCase() })
    .select("+password")
    .populate("employee", "department designation");
  if (!user) {
    throw withStatus("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw withStatus("Your account has been deactivated. Contact your admin.", 401);
  }

  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw withStatus("Invalid email or password", 401);
  }

  if (role && user.role !== role) {
    throw withStatus(`This account does not have access to the ${role} dashboard`, 403);
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  return user;
};

const getCurrentUserProfile = async (userId) => {
  return User.findById(userId).populate("employee", "firstName lastName employeeId department designation");
};

const updateCurrentUserProfile = async (userId, { name, email }) => {
  return User.findByIdAndUpdate(
    userId,
    { name, email },
    { new: true, runValidators: true }
  );
};

const changeCurrentUserPassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select("+password");
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw withStatus("Current password is incorrect", 401);
  }

  user.password = newPassword;
  await user.save();
  return true;
};

const getUsers = async () => {
  return User.find().populate("employee", "firstName lastName employeeId department");
};

const toggleStatus = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    throw withStatus("User not found", 404);
  }

  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });
  return user;
};

const forgotPassword = async (email) => {
  // Find user — but always respond generically to prevent email enumeration
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Return null — controller will still send a 200 OK with a generic message
    return null;
  }

  const rawToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  return { rawToken, email: user.email, name: user.name };
};

const resetPassword = async (token, newPassword) => {
  // Hash the raw URL token to match what's stored in DB
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw withStatus("Reset link is invalid or has expired. Please request a new one.", 400);
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;
  await user.save();

  return true;
};

module.exports = {
  registerUser,
  loginUser,
  getCurrentUserProfile,
  updateCurrentUserProfile,
  changeCurrentUserPassword,
  getUsers,
  toggleStatus,
  forgotPassword,
  resetPassword,
};
