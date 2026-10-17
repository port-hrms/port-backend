
const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
    {
        // ─── Personal Info ─────────────────────────────────────────
        firstName: {
            type: String,
            required: [true, "First name is required"],
            trim: true,
        },
        lastName: {
            type: String,
            required: [true, "Last name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,        // No two employees can have the same email
            lowercase: true,
            trim: true,
        },
        phone: {
            type: String,
            required: [true, "Phone number is required"],
            trim: true,
        },
        dateOfBirth: {
            type: Date,
        },
        gender: {
            type: String,
            enum: ["Male", "Female", "Other"],
        },
        address: {
            type: String,
            trim: true,
        },
        aadharNumber: {
            type: String,
            trim: true,
            default: "",
        },

        // ─── Job Info ──────────────────────────────────────────────
        employeeId: {
            type: String,
            unique: true,        // e.g. EMP001, EMP002
        },
        department: {
            type: String,
            required: [true, "Department is required"],
            enum: ["Engineering", "Marketing", "HR", "Finance", "Sales", "Operations", "Design"],
        },
        designation: {
            type: String,
            required: [true, "Designation is required"],
            trim: true,
        },
        employmentType: {
            type: String,
            enum: ["Full-Time", "Part-Time", "Contract", "Intern"],
            default: "Full-Time",
        },
        joiningDate: {
            type: Date,
            required: [true, "Joining date is required"],
            default: Date.now,
        },
        endingDate: {
            type: Date,
        },
        status: {
            type: String,
            enum: ["Active", "On Leave", "Inactive"],
            default: "Active",
        },

        // ─── Salary Info ───────────────────────────────────────────
        salary: {
            type: Number,
            required: [true, "Salary is required"],
            min: [0, "Salary cannot be negative"],
        },

        // ─── Auth Info (for Phase 5 - Login) ──────────────────────
        password: {
            type: String,
            // Will be filled in Phase 5 when we add authentication
        },
        role: {
            type: String,
            enum: ["admin", "hr", "employee"],
            default: "employee",
        },

        // ─── Profile Picture ───────────────────────────────────────
        avatar: {
            type: String,
            default: "", // Will store image URL later
        },
        isFieldAgent: {
            type: Boolean,
            default: false,
        },
        is_deleted: {
        type: Boolean,
          default: false, 
        },

        // ─── Documents ─────────────────────────────────────────────
        documents: {
            bankDetails:  { type: String, default: "" },
            aadhar:       { type: String, default: "" },
            resume:       { type: String, default: "" },
            offerLetter:  { type: String, default: "" },
        },

        // ─── Bank Info ─────────────────────────────────────────────
        bankInfo: {
            bankName:      { type: String, default: "" },
            accountNumber: { type: String, default: "" },
            ifscCode:      { type: String, default: "" },
            panNumber:     { type: String, default: "" },
            pfNumber:      { type: String, default: "" },
            pfUAN:         { type: String, default: "" },
        },
    },
    {
        // ─── Timestamps ────────────────────────────────────────────
        // Automatically adds `createdAt` and `updatedAt` fields
        timestamps: true,
    }
);

// ─── Auto-generate Employee ID before saving ───────────────────
// Finds the highest existing EMP### number and increments it
employeeSchema.pre("save", async function () {
    if (!this.employeeId) {
        const lastEmployee = await mongoose.model("Employee")
            .findOne({}, { employeeId: 1 })
            .sort({ employeeId: -1 });

        let nextNum = 1;
        if (lastEmployee?.employeeId) {
            const match = lastEmployee.employeeId.match(/EMP(\d+)/);
            if (match) nextNum = parseInt(match[1], 10) + 1;
        }
        this.employeeId = `EMP${String(nextNum).padStart(3, "0")}`;
    }
});

// ─── Virtual: Full Name ────────────────────────────────────────
// A "virtual" is a computed field — not stored in DB but available when you use the model
employeeSchema.virtual("fullName").get(function () {
    return `${this.firstName} ${this.lastName}`;
});

const Employee = mongoose.model("Employee", employeeSchema);

module.exports = Employee;