const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        price: {
            type: Number,
            required: true,
            default: 0,
        },
        billingCycle: {
            type: String,
            enum: ["monthly", "yearly", "one-time"],
            default: "monthly",
        },
        trialDays: {
            type: Number,
            default: 0,
        },
        maxEmployees: {
            type: Number,
            required: true,
        },
        features: {
            type: [String],
            default: [],
        },
        color: {
            type: String,
            default: "#6366f1",
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Plan", planSchema);
