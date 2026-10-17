// server/models/Expense.js
const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Expense title is required"],
            trim: true,
        },
        category: {
            type: String,
            enum: ["Office Supplies", "IT & Software", "Transport", "Food & Entertainment", "Maintenance", "Marketing", "Raw Material", "Utilities", "Other"],
            required: [true, "Category is required"],
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
        mode: {
            type: String,
            enum: ["Cash", "UPI", "Bank Transfer", "Cheque", "Card"],
            default: "UPI",
        },
        description: {
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

module.exports = mongoose.model("Expense", expenseSchema);
