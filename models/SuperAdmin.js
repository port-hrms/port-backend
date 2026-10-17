const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const superAdminSchema = new mongoose.Schema(
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
            select: false,
        },
        platformName: {
            type: String,
            default: "Nebolla",
        },
        lastLogin: {
            type: Date,
        },
    },
    { timestamps: true }
);

superAdminSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});

superAdminSchema.methods.comparePassword = async function (entered) {
    return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model("SuperAdmin", superAdminSchema);
