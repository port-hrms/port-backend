// server/models/WageRecord.js
const mongoose = require("mongoose");

const wageRecordSchema = new mongoose.Schema(
    {
        worker: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Worker",
            required: [true, "Worker reference is required"],
        },
        month: {
            type: Number,
            required: [true, "Month is required"],
            min: 1,
            max: 12,
        },
        year: {
            type: Number,
            required: [true, "Year is required"],
        },
        workerType: {
            type: String,
            enum: ["Daily Worker", "Hourly Worker", "Freelancer"],
            required: [true, "Worker type is required"],
        },
        rateAmount: {
            type: Number,
            required: [true, "Rate amount is required"],
            min: [0.01, "Rate must be greater than 0"],
        },
        workingDays: {
            type: Number,
            default: null,
        },
        workingHours: {
            type: Number,
            default: null,
        },
        totalPayable: {
            type: Number,
            required: [true, "Total payable is required"],
            min: 0,
        },
        dateFrom: {
            type: Date,
            default: null,
        },
        dateTo: {
            type: Date,
            default: null,
        },
        status: {
            type: String,
            enum: ["Draft", "Paid"],
            default: "Draft",
        },
        paidAt: {
            type: Date,
            default: null,
        },
        paymentMethod: {
            type: String,
            enum: ["Bank Transfer", "Cash", "Cheque", "Razorpay", ""],
            default: "",
        },
        razorpayOrderId: {
            type: String,
            default: null,
        },
        razorpayPaymentId: {
            type: String,
            default: null,
        },
        razorpaySignature: {
            type: String,
            default: null,
        },
    },
    { timestamps: true }
);

const WageRecord = mongoose.model("WageRecord", wageRecordSchema);
module.exports = WageRecord;
