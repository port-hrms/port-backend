// server/models/Application.js
// Defines a Job Application submitted by a candidate.


const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
    {
        // ─── Link to Job ──────────────────────────────────────────
        job: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Job",
            required: [true, "Job reference is required"],
        },

        // ─── Applicant Profile ────────────────────────────────────
        firstName: {
            type: String,
            required: [true, "First name is required"],
            trim: true,
        },
        lastName: {
            type: String,
            required: [true, "Last name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            lowercase: true,
            trim: true,
        },
        phone: {
            type: String,
            required: [true, "Phone number is required"],
            trim: true,
        },
        currentLocation: {
            type: String,
            trim: true,
            default: "",
        },
        experienceYears: {
            type: Number,
            default: 0,
        },
        currentCompany: {
            type: String,
            trim: true,
            default: "",
        },
        coverLetter: {
            type: String,
            trim: true,
            default: "",
        },

        resumePath: {
            type: String,
            required: [true, "Resume is required"],
        },
        resumeOriginalName: {
            type: String,
            default: "",  // original filename for display
        },
        status: {
            type: String,
            enum: ["New", "Reviewed"],
            default: "New",
        },

        hrNotes: {
            type: String,
            trim: true,
            default: "",
        },
        appliedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// ─── Compound Index ───────────────────────────────────────────
// Prevent same email from applying to the same job twice
applicationSchema.index({ job: 1, email: 1 }, { unique: true });

const Application = mongoose.model("Application", applicationSchema);
module.exports = Application;