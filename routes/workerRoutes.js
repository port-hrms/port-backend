// server/routes/workerRoutes.js
const express = require("express");
const router = express.Router();
const { createWorker, getWorkers, updateWorker, deleteWorker } = require("../controllers/admin/workerController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

router.get("/",     protect, authorizeRoles("admin"), getWorkers);
router.post("/",    protect, authorizeRoles("admin"), createWorker);
router.put("/:id",  protect, authorizeRoles("admin"), updateWorker);
router.delete("/:id", protect, authorizeRoles("admin"), deleteWorker);

module.exports = router;
