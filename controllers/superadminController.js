const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const SuperAdmin = require("../models/SuperAdmin");
const Organization = require("../models/Organization");
const Plan = require("../models/Plan");
const User = require("../models/User");
const Employee = require("../models/Employee");

// ─── Helper ────────────────────────────────────────────────────
const signToken = (id) =>
    jwt.sign({ id, role: "superadmin" }, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });

// ─── Login ─────────────────────────────────────────────────────
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ success: false, message: "Email and password are required." });

        const admin = await SuperAdmin.findOne({ email }).select("+password");
        if (!admin || !(await admin.comparePassword(password)))
            return res.status(401).json({ success: false, message: "Invalid credentials." });

        admin.lastLogin = new Date();
        await admin.save({ validateBeforeSave: false });

        const token = signToken(admin._id);
        return res.status(200).json({
            success: true,
            message: `Welcome back, ${admin.name}!`,
            token,
            user: {
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                platformName: admin.platformName,
                role: "superadmin",
            },
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─── Analytics ─────────────────────────────────────────────────
const getAnalytics = async (req, res) => {
    try {
        const [orgs, plans, users] = await Promise.all([
            Organization.find().populate("plan"),
            Plan.find(),
            User.find({ role: "admin" }).countDocuments(),
        ]);

        const totalEmployees = await Employee.countDocuments({ is_deleted: { $ne: true } });

        // Revenue = sum of plan prices for all active/trial orgs
        let totalRevenue = 0;
        let mrr = 0;
        for (const org of orgs) {
            if (org.plan && org.status !== "Suspended") {
                totalRevenue += org.plan.price || 0;
                mrr += org.plan.price || 0;
            }
        }

        // Plan distribution
        const planDist = {};
        for (const plan of plans) {
            planDist[plan.name] = orgs.filter(
                (o) => o.plan && String(o.plan._id) === String(plan._id)
            ).length;
        }

        // Revenue last 6 months (simple: current month = mrr, previous = 0 unless we have payment history)
        const now = new Date();
        const revenueByMonth = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const label = d.toLocaleString("en-IN", { month: "short" });
            // Only current month has revenue since we have no payment history model yet
            const amount = i === 0 ? mrr : 0;
            revenueByMonth.push({ month: label, amount });
        }

        // Status counts
        const activeCount = orgs.filter((o) => o.status === "Active").length;
        const suspendedCount = orgs.filter((o) => o.status === "Suspended").length;
        const trialCount = orgs.filter((o) => o.status === "Trial").length;

        // Recent orgs
        const recentOrgs = orgs
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);

        return res.status(200).json({
            success: true,
            data: {
                totalRevenue,
                mrr,
                totalOrgs: orgs.length,
                activeCount,
                suspendedCount,
                trialCount,
                totalEmployees,
                planDist,
                revenueByMonth,
                recentOrgs,
                plans,
            },
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─── Organizations ──────────────────────────────────────────────
const getOrganizations = async (req, res) => {
    try {
        const orgs = await Organization.find()
            .populate("plan", "name price")
            .sort({ createdAt: -1 });

        // For each org, count its employees (employees belonging to its admin user's org)
        const orgsWithCount = await Promise.all(
            orgs.map(async (org) => {
                const empCount = await Employee.countDocuments({
                    organizationId: org._id,
                    is_deleted: { $ne: true },
                });
                return { ...org.toObject(), employeeCount: empCount };
            })
        );

        return res.status(200).json({ success: true, data: orgsWithCount });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

const createOrganization = async (req, res) => {
    try {
        const { orgName, industry, city, planId, adminName, adminEmail, adminPassword } = req.body;

        if (!orgName || !adminEmail || !adminName)
            return res.status(400).json({ success: false, message: "Organization name, admin name, and admin email are required." });

        // Check if email already exists
        const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
        if (existingUser)
            return res.status(400).json({ success: false, message: "A user with this email already exists." });

        const plan = planId ? await Plan.findById(planId) : null;
        const orgStatus = plan && plan.price === 0 ? "Trial" : "Active";

        // Create the Organization first
        const org = await Organization.create({
            name: orgName,
            industry,
            city,
            plan: plan?._id || null,
            status: orgStatus,
            adminName,
            adminEmail,
        });

        // Generate password if not provided
        const rawPassword = adminPassword && adminPassword.trim()
            ? adminPassword.trim()
            : crypto.randomBytes(8).toString("hex");

        // Create the admin User for this org
        const adminUser = await User.create({
            name: adminName,
            email: adminEmail,
            password: rawPassword,
            role: "admin",
            organizationId: org._id,
        });

        org.adminUser = adminUser._id;
        await org.save();

        return res.status(201).json({
            success: true,
            message: `Organization "${orgName}" created successfully.`,
            data: org,
            generatedPassword: !adminPassword ? rawPassword : undefined,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

const toggleSuspend = async (req, res) => {
    try {
        const org = await Organization.findById(req.params.id);
        if (!org) return res.status(404).json({ success: false, message: "Organization not found." });

        org.status = org.status === "Suspended" ? "Active" : "Suspended";
        await org.save();

        return res.status(200).json({
            success: true,
            message: `Organization ${org.status === "Suspended" ? "suspended" : "reactivated"}.`,
            data: org,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// ─── Plans ─────────────────────────────────────────────────────
const getPlans = async (req, res) => {
    try {
        const plans = await Plan.find().sort({ price: 1 });

        // Count subscribers per plan
        const plansWithCount = await Promise.all(
            plans.map(async (plan) => {
                const subscribers = await Organization.countDocuments({ plan: plan._id });
                return { ...plan.toObject(), subscribers };
            })
        );

        return res.status(200).json({ success: true, data: plansWithCount });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

const createPlan = async (req, res) => {
    try {
        const plan = await Plan.create(req.body);
        return res.status(201).json({ success: true, data: plan });
    } catch (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
};

const updatePlan = async (req, res) => {
    try {
        const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!plan) return res.status(404).json({ success: false, message: "Plan not found." });
        return res.status(200).json({ success: true, data: plan });
    } catch (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
};

const deletePlan = async (req, res) => {
    try {
        const plan = await Plan.findByIdAndDelete(req.params.id);
        if (!plan) return res.status(404).json({ success: false, message: "Plan not found." });
        return res.status(200).json({ success: true, message: "Plan deleted." });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

const getPayments = async (req, res) => {
    try {
        const orgs = await Organization.find()
            .populate("plan")
            .sort({ createdAt: -1 });

        const payments = orgs.map((org) => {
            const dateObj = new Date(org.createdAt);
            const y = dateObj.getFullYear();
            const m = String(dateObj.getMonth() + 1).padStart(2, "0");
            const suffix = org._id.toString().slice(-5).toUpperCase();
            const invoice = `INV-${y}${m}-${suffix}`;
            
            const planName = org.plan?.name || "Free Trial";
            const amount = org.plan?.price || 0;
            
            let status = "Paid";
            if (org.status === "Suspended") {
                status = "Failed";
            } else if (org.status === "Trial" || amount === 0) {
                status = "Paid";
            }

            const formattedDate = dateObj.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });

            return {
                id: org._id,
                invoice,
                org: org.name,
                plan: planName,
                amount,
                method: "Card",
                status,
                date: formattedDate,
                createdAt: org.createdAt,
            };
        });

        return res.status(200).json({ success: true, data: payments });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

module.exports = {
    login,
    getAnalytics,
    getOrganizations,
    createOrganization,
    toggleSuspend,
    getPlans,
    createPlan,
    updatePlan,
    deletePlan,
    getPayments,
};
