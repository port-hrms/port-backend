
const mongoose = require("mongoose");
const kpiSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    target: {
        type: Number,
        default: 100, // target score out of 100
    },
    achieved: {
        type: Number,
        default: 0,   // actual score given by reviewer
    },
    weight: {
        type: Number,
        default: 1,  
    },
    remarks: {
        type: String,
        default: "",
    },
});

const performanceSchema = new mongoose.Schema(
    {
        // ─── Link to Employee ────────────────────────────────────
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee",
            required: [true, "Employee reference is required"],
        },

        reviewerName: {
            type: String,
            default: "HR Admin",
            trim: true,
        },
        reviewCycle: {
            type: String,
            enum: ["Q1", "Q2", "Q3", "Q4", "Annual", "Probation"],
            required: [true, "Review cycle is required"],
        },
        year: {
            type: Number,
            required: [true, "Year is required"],
        },
        reviewDate: {
            type: Date,
            default: Date.now,
        },
        kpis: {
            type: [kpiSchema],
            default: [],
        },
        overallScore: {
            type: Number,
            default: 0,   // 0 - 100
        },
        grade: {
            type: String,
            enum: ["Excellent", "Good", "Average", "Needs Improvement", "Poor", ""],
            default: "",
        },
        strengths: {
            type: String,
            default: "",
            trim: true,
        },
        areasOfImprovement: {
            type: String,
            default: "",
            trim: true,
        },
        goals: {
            type: String, // goals for next cycle
            default: "",
            trim: true,
        },
        managerComments: {
            type: String,
            default: "",
            trim: true,
        },
        employeeComments: {
            type: String,
            default: "",
            trim: true,
        },

        // ─── Rating Categories (1-5 stars) ───────────────────────
        technicalSkills: { type: Number, min: 1, max: 5, default: 3 },
        communication: { type: Number, min: 1, max: 5, default: 3 },
        teamwork: { type: Number, min: 1, max: 5, default: 3 },
        leadership: { type: Number, min: 1, max: 5, default: 3 },
        punctuality: { type: Number, min: 1, max: 5, default: 3 },
        problemSolving: { type: Number, min: 1, max: 5, default: 3 },

        // ─── Status ──────────────────────────────────────────────
        status: {
            type: String,
            enum: ["Draft", "Submitted", "Acknowledged", "Closed"],
            default: "Draft",
        },

        // ─── Increment / Promotion ───────────────────────────────
        incrementRecommended: {
            type: Boolean,
            default: false,
        },
        incrementPercent: {
            type: Number,
            default: 0,
        },
        promotionRecommended: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// ─── Compound Index ───────────────────────────────────────────
// One review per employee per cycle per year
performanceSchema.index(
    { employee: 1, reviewCycle: 1, year: 1 },
    { unique: true }
);

// ─── Pre-save: Auto-calculate overallScore and grade ─────────
performanceSchema.pre("save", function () {
    // Calculate overall score from KPIs if KPIs exist
    if (this.kpis && this.kpis.length > 0) {
        const totalWeight = this.kpis.reduce((sum, k) => sum + (k.weight || 1), 0);
        const weightedScore = this.kpis.reduce((sum, k) => {
            const pct = k.target > 0 ? (k.achieved / k.target) * 100 : 0;
            return sum + pct * (k.weight || 1);
        }, 0);
        this.overallScore = Math.round(weightedScore / totalWeight);
    } else {
        // Calculate from rating categories if no KPIs
        const ratings = [
            this.technicalSkills, this.communication, this.teamwork,
            this.leadership, this.punctuality, this.problemSolving,
        ];
        const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;
        this.overallScore = Math.round((avg / 5) * 100);
    }

    // Assign grade based on overall score
    if (this.overallScore >= 90) this.grade = "Excellent";
    else if (this.overallScore >= 75) this.grade = "Good";
    else if (this.overallScore >= 60) this.grade = "Average";
    else if (this.overallScore >= 40) this.grade = "Needs Improvement";
    else this.grade = "Poor";
});

const Performance = mongoose.model("Performance", performanceSchema);

module.exports = Performance;