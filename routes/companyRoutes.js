const express = require("express");
const router = express.Router();
const { getCompanySettings, updateCompanySettings } = require("../controllers/admin/companyController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.route("/")
  .get(protect, getCompanySettings)
  .put(protect, authorizeRoles("admin"), updateCompanySettings);

module.exports = router;
