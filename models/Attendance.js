

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
            // Same types as leave requests (+ "Paid Leave" kept for older records)
            enum: ["Sick Leave", "Casual Leave", "Earned Leave", "Maternity Leave", "Special Leave", "Unpaid Leave", "Paid Leave", ""],
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
            accuracy: { type: Number, default: null }, // metres, as reported by the phone
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
            accuracy: { type: Number, default: null },
        },

        // ─── Work Mode ────────────────────────────────────────────
        // "Office" = normal on-site day, "WFH" = approved remote day
        workMode: {
            type: String,
            enum: ["Office", "WFH"],
            default: "Office",
        },

        // ─── Trust & control ──────────────────────────────────────
        // How the record came to exist
        source: {
            type: String,
            enum: ["self", "admin", "leave", "system"],
            default: "self",
        },
        // Checked in on a past day but never checked out
        missedCheckOut: { type: Boolean, default: false },
        checkoutReminderSentAt: { type: Date, default: null },

        // Soft delete — hidden everywhere, kept for the record
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date, default: null },
        deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        deleteReason: { type: String, default: "" },

        // Every manual / automatic change: who, when, why and what changed
        history: [
            {
                _id: false,
                at: { type: Date, default: Date.now },
                by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
                byName: { type: String, default: "" },
                action: { type: String, default: "" }, // created | updated | deleted | restored | leave | missed-check-out
                reason: { type: String, default: "" },
                changes: [{ _id: false, field: String, from: String, to: String }],
            },
        ],
    },
    {
        timestamps: true, // auto adds createdAt and updatedAt
    }
);

// One live record per employee per day (deleted records don't count)
attendanceSchema.index(
    { employee: 1, date: 1 },
    { unique: true, partialFilterExpression: { isDeleted: false }, name: "employee_date_live_unique" }
);

// Deleted records are hidden from every query unless { withDeleted: true } is set
function hideDeleted() {
    if (this.getOptions().withDeleted) return;
    if (this.getQuery().isDeleted === undefined) this.where({ isDeleted: { $ne: true } });
}
attendanceSchema.pre(
    ["find", "findOne", "countDocuments", "findOneAndUpdate", "updateOne", "updateMany", "deleteOne", "deleteMany"],
    hideDeleted
);
attendanceSchema.pre("aggregate", function () {
    if (this.options?.withDeleted) return;
    this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
});

const Attendance = mongoose.model("Attendance", attendanceSchema);

module.exports = Attendance;