

const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
    {
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: [true, "Employee reference is required"],
        },

        // ─── Date of Attendance ────────────────────────────────────
        date: {
            type: Date,
            required: [true, "Date is required"],
        },

        // ─── Status ───────────────────────────────────────────────
        status: {
            type: String,
            enum: ["Present", "Absent", "On Leave", "Half Day", "Late"],
            required: [true, "Attendance status is required"],
            default: "Present",
        },

        // ─── Check In / Out Times ─────────────────────────────────
        checkIn: {
            type: String, // stored as "09:02 AM"
            default: "",
        },
        checkOut: {
            type: String, // stored as "06:05 PM"
            default: "",
        },

        // ─── Total Working Hours ──────────────────────────────────
        hoursWorked: {
            type: Number, // stored as decimal e.g. 9.5 = 9 hrs 30 min
            default: 0,
        },

        leaveType: {
            type: String,
            enum: ["Sick Leave", "Casual Leave", "Paid Leave", "Unpaid Leave", ""],
            default: "",
        },

        remarks: {
            type: String,
            trim: true,
            default: "",
        },

        location: {
            lat: {
                type: Number,
                default: null,
            },
            lng: {
                type: Number,
                default: null,
            },
        },
        checkOutLocation: {
            lat: {
                type: Number,
                default: null,
            },
            lng: {
                type: Number,
                default: null,
            },
        },

        // ─── Work Mode ────────────────────────────────────────────
        // "Office" = normal on-site day, "WFH" = approved remote day
        workMode: {
            type: String,
            enum: ["Office", "WFH"],
            default: "Office",
        },
    },
    {
        timestamps: true, // auto adds createdAt and updatedAt
    }
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);

module.exports = Attendance;