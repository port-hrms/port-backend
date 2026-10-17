// server/seed/superadminSeed.js
// Seeds the root SuperAdmin and default Subscription Plans if not already present.

const SuperAdmin = require("../models/SuperAdmin");
const Plan = require("../models/Plan");

const DEFAULT_PLANS = [
    {
        name: "Free Trial",
        price: 0,
        billingCycle: "one-time",
        trialDays: 14,
        maxEmployees: 10,
        features: ["All Growth features", "Trial watermark", "No card required"],
        color: "#f97316",
    },
    {
        name: "Starter",
        price: 999,
        billingCycle: "monthly",
        maxEmployees: 25,
        features: ["Attendance & Leaves", "Payroll (basic)", "Email support"],
        color: "#64748b",
    },
    {
        name: "Growth",
        price: 2499,
        billingCycle: "monthly",
        maxEmployees: 100,
        features: [
            "Everything in Starter",
            "Recruitment & Onboarding",
            "Field tracking",
            "Priority support",
        ],
        color: "#6366f1",
    },
    {
        name: "Enterprise",
        price: 5999,
        billingCycle: "monthly",
        maxEmployees: 500,
        features: [
            "Everything in Growth",
            "Custom branding",
            "Dedicated manager",
            "API access",
        ],
        color: "#8b5cf6",
    },
];

const seedSuperAdmin = async () => {
    try {
        // Seed root SuperAdmin
        const existing = await SuperAdmin.findOne({ email: "superadmin@nebolla.com" });
        if (!existing) {
            await SuperAdmin.create({
                name: "Root Super Admin",
                email: "superadmin@nebolla.com",
                password: "SuperAdmin123",
                platformName: "Nebolla",
            });
            console.log("✅ SuperAdmin seeded: superadmin@nebolla.com / SuperAdmin123");
        }

        // Seed default plans
        const planCount = await Plan.countDocuments();
        if (planCount === 0) {
            await Plan.insertMany(DEFAULT_PLANS);
            console.log("✅ Default subscription plans seeded.");
        }
    } catch (err) {
        console.error("❌ SuperAdmin seed error:", err.message);
    }
};

module.exports = seedSuperAdmin;
