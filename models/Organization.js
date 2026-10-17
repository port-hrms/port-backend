const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Organization name is required"],
            trim: true,
        },
        industry: {
            type: String,
            trim: true,
            default: "",
        },
        city: {
            type: String,
            trim: true,
            default: "",
        },
        plan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Plan",
        },
        status: {
            type: String,
            enum: ["Active", "Trial", "Suspended"],
            default: "Trial",
        },
        // The admin user created for this org
        adminUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        adminName: {
            type: String,
            trim: true,
        },
        adminEmail: {
            type: String,
            lowercase: true,
            trim: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Organization", organizationSchema);
