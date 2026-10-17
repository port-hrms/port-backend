
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        recipientUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        recipientRole: {
            type: String,
            enum: ["admin", "hr", "employee", ""],
            default: "",
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            default: "info",
            trim: true,
        },
        link: {
            type: String,
            default: "",
            trim: true,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
