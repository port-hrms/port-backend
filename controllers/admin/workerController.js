// server/controllers/admin/workerController.js
// @ts-nocheck
const Worker = require("../../models/Worker");

// ─── Create a worker ──────────────────────────────────────────
const createWorker = async (req, res) => {
    try {
        const { fullName, phone, bank } = req.body;

        if (!fullName || !phone) {
            return res.status(400).json({ success: false, message: "Full name and phone are required" });
        }

        const worker = await Worker.create({ fullName, phone, bank: bank || {} });

        return res.status(201).json({
            success: true,
            message: "Worker registered successfully",
            data: worker,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Failed to create worker",
        });
    }
};

// ─── Get all workers ──────────────────────────────────────────
const getWorkers = async (req, res) => {
    try {
        const workers = await Worker.find().sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: workers.length,
            data: workers,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch workers",
            error: error.message,
        });
    }
};

// ─── Update a worker ──────────────────────────────────────────
const updateWorker = async (req, res) => {
    try {
        const worker = await Worker.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

        if (!worker) {
            return res.status(404).json({ success: false, message: "Worker not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Worker updated successfully",
            data: worker,
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: "Failed to update worker",
            error: error.message,
        });
    }
};

// ─── Delete a worker ──────────────────────────────────────────
const deleteWorker = async (req, res) => {
    try {
        const worker = await Worker.findByIdAndDelete(req.params.id);

        if (!worker) {
            return res.status(404).json({ success: false, message: "Worker not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Worker deleted successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to delete worker",
            error: error.message,
        });
    }
};

module.exports = { createWorker, getWorkers, updateWorker, deleteWorker };
