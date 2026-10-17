const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
    {
        // ─── Job Details ──────────────────────────────────────────
        title: {
            type: String,
            required: [true, "Job title is required"],
            trim: true,
        },
        department: {
            type: String,
            enum: ["Engineering", "Marketing", "HR", "Finance", "Sales", "Operations", "Design"],
            required: [true, "Department is required"],
        },
        location: {
            type: String,
            required: [true, "Location is required"],
            trim: true,
        },
        jobType: {
            type: String,
            enum: ["Full-Time", "Part-Time", "Contract", "Intern", "Remote"],
            default: "Full-Time",
        },
        experienceLevel: {
            type: String,
            enum: ["Fresher", "1-2 Years", "3-5 Years", "5+ Years"],
            default: "Fresher",
        },

        // ─── Salary Range ─────────────────────────────────────────
        salaryMin: { type: Number, default: 0 },
        salaryMax: { type: Number, default: 0 },

        // ─── Description ──────────────────────────────────────────
        description: {
            type: String,
            required: [true, "Job description is required"],
            trim: true,
        },
        requirements: {
            type: String, // bullet points as plain text
            trim: true,
            default: "",
        },
        responsibilities: {
            type: String,
            trim: true,
            default: "",
        },
        status: {
            type: String,
            enum: ["Active", "Closed", "Draft"],
            default: "Active",
        },

        deadline: {
            type: Date,
            default: null,
        },
        postedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        applicationCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

const Job = mongoose.model("Job", jobSchema);
module.exports = Job;