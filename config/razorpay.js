// server/config/razorpay.js
// ─────────────────────────────────────────────────────────────
// Returns a Razorpay instance lazily so that dotenv has already
// populated process.env before we read the keys.
// ─────────────────────────────────────────────────────────────
const Razorpay = require("razorpay");

let _instance = null;

function getRazorpayInstance() {
    if (_instance) return _instance;

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret || keyId.includes("placeholder") || keySecret.includes("placeholder")) {
        console.warn("\n========================================================");
        console.warn("WARNING: Valid Razorpay API keys are not defined in server/.env");
        console.warn("Please define RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
        console.warn("========================================================\n");
    }

    _instance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });

    return _instance;
}

module.exports = getRazorpayInstance;
