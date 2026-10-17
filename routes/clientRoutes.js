const express = require("express");
const router = express.Router();
const { getAll, getById, create, update, remove, getStats } = require("../controllers/admin/clientController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.route("/stats").get(protect, authorizeRoles("admin"), getStats);

router.route("/")
  .get(protect, authorizeRoles("admin"), getAll)
  .post(protect, authorizeRoles("admin"), create);

router.route("/:id")
  .get(protect, authorizeRoles("admin"), getById)
  .put(protect, authorizeRoles("admin"), update)
  .delete(protect, authorizeRoles("admin"), remove);

module.exports = router;
