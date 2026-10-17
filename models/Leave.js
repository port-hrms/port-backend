// @ts-nocheck
const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
  {
    // ─── Link to Employee ──────────────────────────────────────
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Employee reference is required"],
    },

    // ─── Leave Type ───────────────────────────────────────────
    leaveType: {
      type: String,
      enum: ["Sick Leave", "Casual Leave", "Earned Leave", "Maternity Leave", "Special Leave", "Unpaid Leave"],
      required: [true, "Leave type is required"],
    },

    // ─── Start Date ───────────────────────────────────────────
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },

    // ─── End Date ──────────────────────────────────────────────
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },

    // ─── Number of Days ───────────────────────────────────────
    numberOfDays: {
      type: Number,
      required: [true, "Number of days is required"],
      min: 0.5,
    },

    // ─── Reason / Description ────────────────────────────────
    reason: {
      type: String,
      required: [true, "Reason is required"],
      maxlength: 500,
    },

    // ─── Status ───────────────────────────────────────────────
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Cancelled"],
      default: "Pending",
    },

    // ─── Manager Notes (for approval/rejection) ──────────────
    managerNotes: {
      type: String,
      default: "",
      maxlength: 300,
    },

    // ─── Approved By (Manager Reference) ────────────────────
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ─── Timestamps ───────────────────────────────────────────
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Compound index for employee + date range queries
leaveSchema.index({ employee: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model("Leave", leaveSchema);
