// @ts-nocheck
const mongoose = require("mongoose");

const wfhRequestSchema = new mongoose.Schema(
  {
    // ─── Link to Employee ──────────────────────────────────────
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Employee reference is required"],
    },

    // ─── Date Range ───────────────────────────────────────────
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },

    // ─── Number of Days ───────────────────────────────────────
    numberOfDays: {
      type: Number,
      required: [true, "Number of days is required"],
      min: 1,
    },

    // ─── Reason ───────────────────────────────────────────────
    reason: {
      type: String,
      required: [true, "Reason is required"],
      maxlength: 500,
      trim: true,
    },

    // ─── Status ───────────────────────────────────────────────
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Cancelled"],
      default: "Pending",
    },

    // ─── Manager Notes ────────────────────────────────────────
    managerNotes: {
      type: String,
      default: "",
      maxlength: 300,
    },

    // ─── Approved By ──────────────────────────────────────────
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for quick per-employee date range lookups
wfhRequestSchema.index({ employee: 1, startDate: 1, endDate: 1 });
wfhRequestSchema.index({ status: 1, startDate: 1 });

module.exports = mongoose.model("WFHRequest", wfhRequestSchema);
