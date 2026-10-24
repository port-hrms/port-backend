// @ts-nocheck
const jwt = require("jsonwebtoken");

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

const pickUserData = (user) => {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    employee: user.employee?._id || user.employee,
    department: user.employee?.department || null,
    designation: user.employee?.designation || null,
    lastLogin: user.lastLogin,
  };
};

const sendTokenResponse = (user, statusCode, res, message) => {
  const token = generateToken(user._id);
  const userData = pickUserData(user);

  return res.status(statusCode).json({
    success: true,
    message,
    token,
    user: userData,
  });
};

module.exports = {
  generateToken,
  pickUserData,
  sendTokenResponse,
};
