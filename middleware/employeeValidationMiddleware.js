// @ts-nocheck

const validateCreateEmployeeInput = (req, res, next) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    department,
    designation,
    salary,
    joiningDate,
    createLogin,
    loginPassword,
    aadharNumber,
    bankName,
    accountNumber,
    ifscCode,
    panNumber,
  } = req.body;

  if (
    !firstName || !lastName || !email || !phone || !department || !designation || !salary || !joiningDate ||
    !aadharNumber || !bankName || !accountNumber || !ifscCode || !panNumber
  ) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields, including Aadhaar and bank details",
    });
  }

  if (!/^\d{12}$/.test(aadharNumber)) {
    return res.status(400).json({
      success: false,
      message: "Aadhaar number must be exactly 12 digits",
    });
  }

  if (!/^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/.test(panNumber)) {
    return res.status(400).json({
      success: false,
      message: "Invalid PAN number format",
    });
  }

  if (createLogin && (!loginPassword || loginPassword.length < 6)) {
    return res.status(400).json({
      success: false,
      message: "Login password must be at least 6 characters",
    });
  }

  next();
};

module.exports = {
  validateCreateEmployeeInput,
};
