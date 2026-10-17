// server/controllers/admin/wageController.js
// @ts-nocheck

const WageRecord = require("../../models/WageRecord");

// ─── Create a new wage record ──────────────────────────────────
const createWage = async (req, res) => {
    try {
        const { workerId, month, year, workerType, rateAmount, workingDays, workingHours, totalPayable, dateFrom, dateTo } = req.body;

        if (!workerId || !month || !year || !workerType || !rateAmount || totalPayable === undefined) {
            return res.status(400).json({ success: false, message: "workerId, month, year, workerType, rateAmount and totalPayable are required" });
        }

        const wage = await WageRecord.create({
            worker: workerId,
            month,
            year,
            workerType,
            rateAmount,
            workingDays: workingDays ?? null,
            workingHours: workingHours ?? null,
            totalPayable,
            dateFrom: dateFrom || null,
            dateTo:   dateTo   || null,
        });

        const populated = await wage.populate("worker", "fullName phone bank");

        return res.status(201).json({
            success: true,
            message: "Wage record created successfully",
            data: populated,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to create wage record",
        });
    }
};

// ─── Get all wage records (filterable by month/year/status) ───
const getWages = async (req, res) => {
    try {
        const { month, year, status } = req.query;
        const filter = {};

        if (month) filter.month = Number(month);
        if (year)  filter.year  = Number(year);
        if (status && status !== "All") filter.status = status;

        const wages = await WageRecord.find(filter)
            .populate("worker", "fullName phone bank")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: wages.length,
            data: wages,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch wage records",
            error: error.message,
        });
    }
};

// ─── Mark a wage record as paid ───────────────────────────────
const markWageAsPaid = async (req, res) => {
    try {
        const { paymentMethod } = req.body;

        const wage = await WageRecord.findByIdAndUpdate(
            req.params.id,
            {
                status: "Paid",
                paidAt: new Date(),
                paymentMethod: paymentMethod || "Bank Transfer",
            },
            { new: true }
        ).populate("worker", "fullName phone bank");

        if (!wage) {
            return res.status(404).json({ success: false, message: "Wage record not found" });
        }

        return res.status(200).json({
            success: true,
            message: `Wage marked as paid for ${wage.worker.fullName}`,
            data: wage,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Failed to mark wage as paid",
            error: error.message,
        });
    }
};

// ─── Delete a wage record ─────────────────────────────────────
const deleteWage = async (req, res) => {
    try {
        const wage = await WageRecord.findByIdAndDelete(req.params.id);

        if (!wage) {
            return res.status(404).json({ success: false, message: "Wage record not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Wage record deleted successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to delete wage record",
            error: error.message,
        });
    }
};

const getRazorpayInstance = require("../../config/razorpay");
const crypto = require("crypto");

const createWageRazorpayOrder = async (req, res) => {
    try {
        const wage = await WageRecord.findById(req.params.id);
        if (!wage) {
            return res.status(404).json({ success: false, message: "Wage record not found" });
        }

        if (wage.status === "Paid") {
            return res.status(400).json({ success: false, message: "Wage record is already paid" });
        }

        if (wage.totalPayable <= 0) {
            return res.status(400).json({ success: false, message: "Total payable must be greater than 0" });
        }

        const options = {
            amount: Math.round(wage.totalPayable * 100), // in paise
            currency: "INR",
            receipt: `wage_${wage._id}`,
        };

        const razorpay = getRazorpayInstance();
        const order = await razorpay.orders.create(options);

        return res.status(200).json({
            success: true,
            key_id: process.env.RAZORPAY_KEY_ID,
            order,
        });
    } catch (error) {
        console.error("[Wage Razorpay Order Error]", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create Wage Razorpay order",
            error: error?.error?.description || error?.message || "Unknown error",
            razorpayError: error?.error || null,
        });
    }
};

const verifyWageRazorpayPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required",
            });
        }

        const secret = process.env.RAZORPAY_KEY_SECRET;
        const generated_signature = crypto
            .createHmac("sha256", secret)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "Payment verification failed. Invalid signature.",
            });
        }

        const wage = await WageRecord.findByIdAndUpdate(
            req.params.id,
            {
                status: "Paid",
                paidAt: new Date(),
                paymentMethod: "Razorpay",
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature,
            },
            { new: true }
        ).populate("worker", "fullName phone bank");

        if (!wage) {
            return res.status(404).json({ success: false, message: "Wage record not found" });
        }

        return res.status(200).json({
            success: true,
            message: `Wage payment processed successfully via Razorpay for ${wage.worker.fullName}`,
            data: wage,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error verifying Wage Razorpay payment",
            error: error.message,
        });
    }
};

module.exports = { createWage, getWages, markWageAsPaid, deleteWage, createWageRazorpayOrder, verifyWageRazorpayPayment };
