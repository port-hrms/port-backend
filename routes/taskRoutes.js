
const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  createTask,
  getTasks,
  addTaskUpdate,
} = require("../controllers/taskController");

const router = express.Router();

router.get("/", protect, authorizeRoles("admin", "employee"), getTasks);
router.post("/", protect, authorizeRoles("admin", "employee"), createTask);
router.patch("/:id/update", protect, authorizeRoles("employee"), addTaskUpdate);

module.exports = router;
