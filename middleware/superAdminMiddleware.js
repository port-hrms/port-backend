const jwt = require("jsonwebtoken");
const SuperAdmin = require("../models/SuperAdmin");

const protectSuperAdmin = async (req, res, next) => {
    try {
        let token;
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")
        ) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access denied. SuperAdmin token required.",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== "superadmin") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Not a SuperAdmin token.",
            });
        }

        const admin = await SuperAdmin.findById(decoded.id);
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: "SuperAdmin not found.",
            });
        }

        req.superAdmin = admin;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired SuperAdmin token.",
        });
    }
};

module.exports = { protectSuperAdmin };
