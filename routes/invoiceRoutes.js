const express = require("express");
const router = express.Router();
const { getAll, getById, create, createFromQuotation, update, remove, updatePaymentStatus, generatePDF, sendEmail, getStats } = require("../controllers/admin/invoiceController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.route("/stats").get(protect, authorizeRoles("admin"), getStats);

router.route("/from-quotation").post(protect, authorizeRoles("admin"), createFromQuotation);

router.route("/")
  .get(protect, authorizeRoles("admin"), getAll)
  .post(protect, authorizeRoles("admin"), create);

router.route("/:id")
  .get(protect, authorizeRoles("admin"), getById)
  .put(protect, authorizeRoles("admin"), update)
  .delete(protect, authorizeRoles("admin"), remove);

router.route("/:id/payment-status").patch(protect, authorizeRoles("admin"), updatePaymentStatus);
router.route("/:id/pdf").get(protect, authorizeRoles("admin"), generatePDF);
router.route("/:id/send-email").post(protect, authorizeRoles("admin"), sendEmail);

module.exports = router;
