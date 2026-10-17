
const mongoose = require("mongoose");

const trackingSchema = new mongoose.Schema(
    {
        // ─── Link to Employee ──────────────────────────────────────
        agent: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: [true, "Agent (employee) reference is required"],
        },

        // ─── GPS Coordinates ──────────────────────────────────────
        latitude: {
            type: Number,
            required: [true, "Latitude is required"],
        },
        longitude: {
            type: Number,
            required: [true, "Longitude is required"],
        },

        // ─── Accuracy of GPS reading (in metres) ──────────────────
        accuracy: {
            type: Number,
            default: 0,
        },

        // ─── Visit Details ────────────────────────────────────────
        clientName: {
            type: String,
            trim: true,
            default: "",  // optional — agent fills when visiting a client
        },
        notes: {
            type: String,
            trim: true,
            default: "",  // optional — what happened at this visit
        },

        // ─── Visit Status ─────────────────────────────────────────
        visitStatus: {
            type: String,
            enum: ["Travelling", "At Client", "Break", "Checked In", "Checked Out", ""],
            default: "Travelling",
        },

        // ─── Address (reverse geocoded from lat/lng) ──────────────
        // Your tracking software can send this if it supports it
        address: {
            type: String,
            default: "",
        },

        visitImage: {
            type: String,
            default: "",
        },

        leadType: {
            type: String,
            enum: ["Client", "Internship", ""],
            default: "",
        },
        projectRequirement: {
            type: String,
            default: "",
        },
        internshipDomain: {
            type: String,
            default: "",
        },

        // ─── Date of this ping (for filtering by day) ─────────────
        date: {
            type: Date,
            default: Date.now,
        },

        isLatest: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true, // createdAt = exact time of ping
    }
);

// ─── Indexes ──────────────────────────────────────────────────
// Fast lookup by agent + date (for history queries)
trackingSchema.index({ agent: 1, date: -1 });

// Fast lookup for live map (find all latest positions)
trackingSchema.index({ isLatest: 1 });

const Tracking = mongoose.model("Tracking", trackingSchema);

module.exports = Tracking;