// server/models/Payroll.js
// ─────────────────────────────────────────────────────────────
// Defines the structure of a Payroll record in MongoDB.
// One payroll record is created per employee per month.
// ─────────────────────────────────────────────────────────────

const mongoose = require("mongoose");

const payrollSchema = new mongoose.Schema(
    {
        // ─── Link to Employee ──────────────────────────────────────
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: [true, "Employee reference is required"],
        },

        // ─── Payroll Period ────────────────────────────────────────
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

        attendance: {
            workingDays: {
                type: Number,
                default: 26,
            },
            presentDays: {
                type: Number,
                default: 0,
            },
            lopDays: {
                type: Number,
                default: 0,
            },
        },

        earnings: {
            basic: {
                type: Number,
                required: [true, "Basic is required"],
                min: 0,
            },
            hra: {
                type: Number,
                default: 0,
            },
            bonus: {
                type: Number,
                default: 0,
            },
        },

        deductions: {
            pf: {
                type: Number,
                default: 0,
            },
            esi: {
                type: Number,
                default: 0,
            },
            ptax: {
                type: Number,
                default: 0,
            },
            leaveDeduction: {
                type: Number,
                default: 0,
            },
        },

        payment: {
            status: {
                type: String,
                enum: ["Draft", "Processed", "Paid", "Hold"],
                default: "Draft",
            },
            mode: {
                type: String,
                enum: ["Bank Transfer", "Cash", "Cheque", "Razorpay", ""],
                default: "",
            },
            date: {
                type: Date,
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
    },
    {
        timestamps: true,
    }
);

// ─── Compound Index ───────────────────────────────────────────
// One payroll record per employee per month per year
payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

const Payroll = mongoose.model("Payroll", payrollSchema);

module.exports = Payroll;