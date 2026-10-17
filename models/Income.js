// server/models/Income.js
const mongoose = require("mongoose");

const incomeSchema = new mongoose.Schema(
    {
        source: {
            type: String,
            enum: ["Client Payment", "Project Payment", "Retainer Fee", "Product Sale", "Consulting", "Other"],
            required: [true, "Source is required"],
        },
        clientName: {
            type: String,
            required: [true, "Client name is required"],
            trim: true,
        },
        amount: {
            type: Number,
            required: [true, "Amount is required"],
            min: [0, "Amount cannot be negative"],
        },
        date: {
            type: Date,
            required: [true, "Date is required"],
        },
        method: {
            type: String,
            enum: ["Bank Transfer", "UPI", "Cash", "Cheque", "Card"],
            default: "Bank Transfer",
        },
        description: {
            type: String,
            trim: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Income", incomeSchema);
