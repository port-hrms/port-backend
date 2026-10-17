// @ts-nocheck
// server/seed/createUsers.js
// ─────────────────────────────────────────────────────────────
// Run this ONCE to create demo users in your database.
//
// Usage:
//   cd server
//   node seed/createUsers.js
// ─────────────────────────────────────────────────────────────

const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");
const User = require("../models/User");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DEMO_USERS = [
    {
        name: "Super Admin",
        email: "admin@hr.com",
        password: "admin123",
        role: "admin",
    }
];

const seed = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // Clear existing users (optional — comment out to keep existing users)
        // await User.deleteMany({});
        // console.log("🗑️  Cleared existing users");

        // Create demo users
        // Passwords are hashed automatically by the User model's pre-save hook
        for (const userData of DEMO_USERS) {
            const user = await User.create(userData);
            console.log(`✅ Created: ${user.name} (${user.role}) — ${user.email}`);
        }

        console.log("\n🎉 Seed complete! Use these credentials to log in:");
        console.log("─────────────────────────────────────────────");
        DEMO_USERS.forEach((u) => {
            console.log(`${u.role.toUpperCase().padEnd(8)} → ${u.email} / ${u.password}`);
        });
        console.log("─────────────────────────────────────────────");

        process.exit(0);
    } catch (error) {
        console.error("❌ Seed failed:", error.message);
        process.exit(1);
    }
};

seed();