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
    panNumber,
  } = req.body;

  // Aadhaar / bank / PAN are optional at onboarding (KYC can be completed later),
  // but must be valid when provided. Bank details are required before a bank-transfer payout.
  if (!firstName || !lastName || !email || !phone || !department || !designation || !salary || !joiningDate) {
    return res.status(400).json({
      success: false,
      message: "Please provide all required fields",
    });
  }

  if (aadharNumber && !/^\d{12}$/.test(aadharNumber)) {
    return res.status(400).json({
      success: false,
      message: "Aadhaar number must be exactly 12 digits",
    });
  }

  if (panNumber && !/^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/.test(panNumber)) {
    return res.status(400).json({
      success: false,
      message: "Invalid PAN number format",
    });
  }

  const wantsLogin = createLogin === true || createLogin === "true";
  const usesInvite = req.body.loginMode !== "password";
  if (wantsLogin && !usesInvite && (!loginPassword || loginPassword.length < 6)) {
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
