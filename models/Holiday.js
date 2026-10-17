const mongoose = require("mongoose");

const holidaySchema = new mongoose.Schema(
  {
    // ─── Holiday Details ─────────────────────────────────────
    name: {
      type: String,
      required: [true, "Holiday name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Holiday date is required"],
      index: true,
    },
    endDate: {
      type: Date,
      default: null, // For multi-day holidays
    },
    
    // ─── Holiday Type ───────────────────────────────────────
    type: {
      type: String,
      enum: ["National", "Regional", "Religious", "Company", "Other"],
      default: "National",
    },

    // ─── Status & Metadata ──────────────────────────────────
    isApproved: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    color: {
      type: String,
      default: "#FF6B6B", // Default red color for holidays
    },
  },
  { timestamps: true }
);

// Index for efficient querying by date range
holidaySchema.index({ date: 1, endDate: 1 });

module.exports = mongoose.model("Holiday", holidaySchema);
