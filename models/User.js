
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },

        password: {
            type: String,
            required: [true, "Password is required"],
            minlength: [6, "Password must be at least 6 characters"],
            select: false, // Never returned in queries by default
        },
        role: {
            type: String,
            enum: ["admin", "hr", "employee"],
            default: "hr",
        },

        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            default: null,
        },
        isActive: {
            type: Boolean,
            default: true,
        },

        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            default: null,
        },

        resetPasswordToken: String,
        resetPasswordExpiry: Date,
        lastLogin: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and store hashed reset token; return raw token for email link
// ttlMinutes: 15 for "forgot password", longer for new-employee invites
userSchema.methods.getResetPasswordToken = function (ttlMinutes = 15) {
    const rawToken = crypto.randomBytes(32).toString("hex");

    // Store SHA-256 hash in DB — never store raw token
    this.resetPasswordToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

    this.resetPasswordExpiry = new Date(Date.now() + ttlMinutes * 60 * 1000);

    return rawToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;