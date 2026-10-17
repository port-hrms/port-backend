
const mongoose = require("mongoose");

const taskUpdateSchema = new mongoose.Schema(
    {
        message: {
            type: String,
            trim: true,
            required: true,
        },
        status: {
            type: String,
            enum: ["Pending", "In Progress", "Completed"],
            default: "Pending",
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        updatedByRole: {
            type: String,
            enum: ["admin", "hr", "employee", ""],
            default: "",
        },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

const taskSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        date: {
            type: Date,
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: "",
        },
        status: {
            type: String,
            enum: ["Pending", "In Progress", "Completed"],
            default: "Pending",
        },
        updates: [taskUpdateSchema],
    },
    { timestamps: true }
);

taskSchema.index({ employee: 1, date: 1 });

const Task = mongoose.model("Task", taskSchema);

module.exports = Task;
