// server/models/Advance.js
const mongoose = require("mongoose");

const advanceSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: [true, "Employee reference is required"],
        },
        amount: {
            type: Number,
            required: [true, "Advance amount is required"],
            min: [1, "Amount must be greater than 0"],
        },
        date: {
            type: Date,
            required: [true, "Date is required"],
        },
        deductionType: {
            type: String,
            enum: ["Full", "Installments"],
            default: "Full",
        },
        installmentAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        paid: {
            type: Number,
            default: 0,
            min: 0,
        },
        status: {
            type: String,
            enum: ["Active", "Cleared"],
            default: "Active",
        },
        notes: {
            type: String,
            default: "",
            trim: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

// Virtual: remaining amount
advanceSchema.virtual("remaining").get(function () {
    return Math.max(0, this.amount - this.paid);
});

advanceSchema.set("toJSON", { virtuals: true });
advanceSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Advance", advanceSchema);
