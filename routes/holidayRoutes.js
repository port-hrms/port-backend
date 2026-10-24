const express = require("express");
const router = express.Router();

const {
  create,
  getAll,
  getByDateRange,
  getById,
  update,
  remove,
  toggleApproval,
  getCalendar,
} = require("../controllers/holidayController");

const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  validateCreateHoliday,
  validateUpdateHoliday,
  validateToggleApproval,
} = require("../middleware/holidayValidationMiddleware");

// ─── All routes require authentication ────────────────────

// ─── Employee routes (GET only) ───────────────────────────

/**
 * @swagger
 * /api/holidays:
 *   get:
 *     summary: Get all approved holidays
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filter by year
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [National, Regional, Religious, Company, Other]
 *         description: Filter by holiday type
 *     responses:
 *       200:
 *         description: Holidays retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/", protect, getAll);

/**
 * @swagger
 * /api/holidays/calendar:
 *   get:
 *     summary: Get holidays for calendar view by month and year
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         required: true
 *         schema:
 *           type: integer
 *         description: Year (e.g., 2024)
 *       - in: query
 *         name: month
 *         required: true
 *         schema:
 *           type: integer
 *         description: Month (1-12)
 *     responses:
 *       200:
 *         description: Calendar holidays retrieved successfully
 *       400:
 *         description: Invalid parameters
 */
router.get("/calendar", protect, getCalendar);

/**
 * @swagger
 * /api/holidays/range:
 *   get:
 *     summary: Get holidays by date range
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Holidays retrieved successfully
 *       400:
 *         description: Invalid date format
 */
router.get("/range", protect, getByDateRange);

/**
 * @swagger
 * /api/holidays/{id}:
 *   get:
 *     summary: Get a specific holiday by ID
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Holiday ID
 *     responses:
 *       200:
 *         description: Holiday retrieved successfully
 *       404:
 *         description: Holiday not found
 */
router.get("/:id", protect, getById);

// ─── Admin routes (CREATE, UPDATE, DELETE) ────────────────

/**
 * @swagger
 * /api/holidays:
 *   post:
 *     summary: Create a new holiday (Admin only)
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - date
 *             properties:
 *               name:
 *                 type: string
 *                 example: "New Year's Day"
 *               description:
 *                 type: string
 *                 example: "Public holiday"
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-01"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-02"
 *               type:
 *                 type: string
 *                 enum: [National, Regional, Religious, Company, Other]
 *                 example: "National"
 *               color:
 *                 type: string
 *                 example: "#FF6B6B"
 *     responses:
 *       201:
 *         description: Holiday created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Admin only
 */
router.post(
  "/",
  protect,
  authorizeRoles("admin"),
  validateCreateHoliday,
  create
);

/**
 * @swagger
 * /api/holidays/{id}:
 *   put:
 *     summary: Update a holiday (Admin only)
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Holiday ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               type:
 *                 type: string
 *                 enum: [National, Regional, Religious, Company, Other]
 *               color:
 *                 type: string
 *     responses:
 *       200:
 *         description: Holiday updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Admin only
 *       404:
 *         description: Holiday not found
 */
router.put(
  "/:id",
  protect,
  authorizeRoles("admin"),
  validateUpdateHoliday,
  update
);

/**
 * @swagger
 * /api/holidays/{id}:
 *   delete:
 *     summary: Delete a holiday (Admin only)
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Holiday ID
 *     responses:
 *       200:
 *         description: Holiday deleted successfully
 *       403:
 *         description: Admin only
 *       404:
 *         description: Holiday not found
 */
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin"),
  remove
);

/**
 * @swagger
 * /api/holidays/{id}/approve:
 *   patch:
 *     summary: Approve or reject a holiday (Admin only)
 *     tags: [Holidays]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Holiday ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isApproved
 *             properties:
 *               isApproved:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Holiday approval status updated
 *       400:
 *         description: Validation error
 *       403:
 *         description: Admin only
 *       404:
 *         description: Holiday not found
 */
router.patch(
  "/:id/approve",
  protect,
  authorizeRoles("admin"),
  validateToggleApproval,
  toggleApproval
);

module.exports = router;
