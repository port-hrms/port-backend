// server/models/Worker.js
const mongoose = require("mongoose");

const workerSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: [true, "Full name is required"],
            trim: true,
        },
        phone: {
            type: String,
            required: [true, "Phone number is required"],
            trim: true,
        },
        bank: {
            name: {
                type: String,
                trim: true,
                default: "",
            },
            account: {
                type: String,
                trim: true,
                default: "",
            },
            ifsc: {
                type: String,
                trim: true,
                default: "",
            },
        },
    },
    { timestamps: true }
);

const Worker = mongoose.model("Worker", workerSchema);
module.exports = Worker;
