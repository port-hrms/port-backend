// @ts-nocheck

const fs = require("fs");
const path = require("path");
const employeeService = require("../../services/employee/employeeService");
const { getEmployeeProfile } = require("../../services/employee/employeeProfileService");
const Employee = require("../../models/Employee");
const User = require("../../models/User");
const { sendEmployeeInviteEmail } = require("../../services/emailService");
const { buildUpdateEmployeeData, toSafeEmployee } = require("../../utils/employeeHelpers");
const resolveStatusCode = (error, fallback = 500) => error?.statusCode || fallback;

const { hasAdminAccess } = require("../../utils/accessHelpers");
const isOwnRecord = (user, employeeId) =>
    Boolean(user?.employee) && String(user.employee._id || user.employee) === String(employeeId);

const DOCUMENT_KEYS = ["bankDetails", "aadhar", "resume", "offerLetter"];
const DOCUMENT_MIME = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
};

// Emails the password-setup link. Never throws — reports whether it was sent.
const deliverInvite = async ({ email, name, rawToken }) => {
    const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
    try {
        await sendEmployeeInviteEmail({
            to: email,
            name,
            setupUrl: `${clientUrl}/reset-password/${rawToken}?invite=1`,
        });
        return { inviteSent: true };
    } catch (error) {
        console.error("Invite email failed:", error.message);
        return { inviteSent: false, inviteError: "The invite email could not be sent. Check the email settings, then use “Send invite” to try again." };
    }
};
const EMPLOYEE_DOCS_DIR = path.resolve(__dirname, "../../uploads/employee-docs");

// Delete a stored document file (only ever inside the employee-docs folder)
const removeStoredFile = (storedPath) => {
    if (!storedPath) return;
    const filePath = path.resolve(EMPLOYEE_DOCS_DIR, path.basename(storedPath));
    if (!filePath.startsWith(EMPLOYEE_DOCS_DIR + path.sep)) return;
    fs.promises.unlink(filePath).catch(() => {});
};

// Files multer just saved for this request — removed again if the request fails
const removeUploadedFiles = (req) => {
    Object.values(req.files || {}).flat().forEach((file) => removeStoredFile(file.filename));
};

const getAllEmployees = async (req, res) => {
    try {
        const result = await employeeService.getAllEmployees(req.query);
        const paged = !Array.isArray(result);
        let employees = paged ? result.items : result;
        
        // Filter sensitive data if user is a regular employee (not admin, hr, or an employee in the HR department)
        let shouldFilter = req.user.role === "employee";
        if (shouldFilter && req.user.employee) {
            const currentEmp = await Employee.findById(req.user.employee);
            if (currentEmp) {
                const dept = (currentEmp.department || "").toLowerCase();
                const desg = (currentEmp.designation || "").toLowerCase();
                if (dept === "hr" || desg === "hr") {
                    shouldFilter = false;
                }
            }
        }

        if (!shouldFilter) {
            const users = await User.find({ employee: { $in: employees.map((e) => e._id) } }).select("employee isActive");
            const loginByEmployee = new Map(users.map((u) => [String(u.employee), u.isActive]));
            employees = employees.map((emp) => ({
                ...toSafeEmployee(emp),
                hasLogin: loginByEmployee.has(String(emp._id)),
            }));
        } else {
            employees = employees.map(emp => ({
                _id: emp._id,
                firstName: emp.firstName,
                lastName: emp.lastName,
                employeeId: emp.employeeId,
                department: emp.department,
                designation: emp.designation,
                status: emp.status
            }));
        }

        return res.status(200).json({
            success: true,
            count: employees.length,
            ...(paged && { total: result.total, page: result.page, pages: result.pages, limit: result.limit }),
            data: employees,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error while fetching employees",
            error: error.message,
        });
    }
};

const getEmployeeById = async (req, res) => {
    try {
        if (!(await hasAdminAccess(req.user)) && !isOwnRecord(req.user, req.params.id)) {
            return res.status(403).json({
                success: false,
                message: "You can only view your own employee record",
            });
        }
        const employee = await employeeService.getEmployeeById(req.params.id);
        return res.status(200).json({
            success: true,
            data: toSafeEmployee(employee),
        });
    } catch (error) {
        return res.status(resolveStatusCode(error, 500)).json({
            success: false,
            message: error.statusCode === 404 ? error.message : "Server error while fetching employee",
            error: error.message,
        });
    }
};

const createEmployee = async (req, res) => {
    try {
        const documents = {};
        if (req.files) {
            const pick = (field) => {
                const file = req.files[field]?.[0];
                if (!file) return "";
                return `uploads/employee-docs/${file.filename}`;
            };
            documents.bankDetails  = pick("bankDetails");
            documents.aadhar       = pick("aadhar");
            documents.resume       = pick("resume");
            documents.offerLetter  = pick("offerLetter");
        }

        const { employee, loginCreated, inviteToken, message } = await employeeService.createEmployee({
            ...req.body,
            documents,
        });
        const invite = inviteToken
            ? await deliverInvite({ email: employee.email, name: employee.firstName, rawToken: inviteToken })
            : {};
        return res.status(201).json({
            success: true,
            message,
            data: {
                ...toSafeEmployee(employee),
                loginCreated,
                hasLogin: loginCreated,
                ...invite,
            },
        });
    } catch (error) {
        removeUploadedFiles(req);
        return res.status(resolveStatusCode(error, 400)).json({
            success: false,
            message: error.publicMessage || "Error creating employee",
            error: error.message,
        });
    }
};

const updateEmployee = async (req, res) => {
    try {
        const documents = {};
        if (req.files) {
            const pick = (field) => {
                const file = req.files[field]?.[0];
                if (!file) return null;
                return `uploads/employee-docs/${file.filename}`;
            };
            const bankDetails = pick("bankDetails");
            const aadhar = pick("aadhar");
            const resume = pick("resume");
            const offerLetter = pick("offerLetter");

            if (bankDetails) documents.bankDetails = bankDetails;
            if (aadhar) documents.aadhar = aadhar;
            if (resume) documents.resume = resume;
            if (offerLetter) documents.offerLetter = offerLetter;
        }

        // Only allow-listed fields are applied; masked values are ignored
        const updateData = buildUpdateEmployeeData(req.body);

        if (Object.keys(documents).length > 0) {
            Object.entries(documents).forEach(([key, value]) => {
                updateData[`documents.${key}`] = value;
            });
        }

        const { updatedEmployee, previousDocuments } = await employeeService.updateEmployee(req.params.id, updateData);

        // A replaced document's old file is no longer referenced — delete it
        Object.keys(documents).forEach((key) => {
            if (previousDocuments?.[key] && previousDocuments[key] !== documents[key]) {
                removeStoredFile(previousDocuments[key]);
            }
        });

        return res.status(200).json({
            success: true,
            message: `Employee ${updatedEmployee.firstName} ${updatedEmployee.lastName} updated successfully`,
            data: toSafeEmployee(updatedEmployee),
        });
    } catch (error) {
        removeUploadedFiles(req);
        return res.status(resolveStatusCode(error, 400)).json({
            success: false,
            message: error.statusCode ? error.message : "Error updating employee",
            error: error.message,
        });
    }
};

const deleteEmployee = async (req, res) => {
    try {
        const employee = await employeeService.deleteEmployee(req.params.id);
        return res.status(200).json({
            success: true,
            message: `${employee.firstName} ${employee.lastName} was removed. Their login is disabled and records are kept.`,
            data: {},
        });
    } catch (error) {
        return res.status(resolveStatusCode(error, 500)).json({
            success: false,
            message: "Error deleting employee",
            error: error.message,
        });
    }
};

const getEmployeeStats = async (req, res) => {
    try {
        const stats = await employeeService.getEmployeeStats();
        return res.status(200).json({
            success: true,
            data: stats,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error fetching stats",
            error: error.message,
        });
    }
};

// Full (unmasked) identity and bank details — admin only, used by "Reveal" and the edit form
const getEmployeeSensitive = async (req, res) => {
    try {
        const employee = await employeeService.getEmployeeById(req.params.id);
        return res.status(200).json({
            success: true,
            data: {
                aadharNumber: employee.aadharNumber || "",
                bankInfo: employee.bankInfo?.toObject ? employee.bankInfo.toObject() : (employee.bankInfo || {}),
            },
        });
    } catch (error) {
        return res.status(resolveStatusCode(error, 500)).json({
            success: false,
            message: error.statusCode === 404 ? error.message : "Server error while fetching details",
        });
    }
};

// Streams an uploaded document — admin/HR or the employee themself only
const downloadEmployeeDocument = async (req, res) => {
    try {
        const { id, docKey } = req.params;
        if (!DOCUMENT_KEYS.includes(docKey)) {
            return res.status(400).json({ success: false, message: "Unknown document type" });
        }
        if (!(await hasAdminAccess(req.user)) && !isOwnRecord(req.user, id)) {
            return res.status(403).json({ success: false, message: "Not allowed to view this document" });
        }

        const employee = await employeeService.getEmployeeById(id);
        const storedPath = employee.documents?.[docKey];
        if (!storedPath) {
            return res.status(404).json({ success: false, message: "Document not uploaded" });
        }

        // Resolve inside the employee-docs folder only (blocks ../ path tricks)
        const filePath = path.resolve(EMPLOYEE_DOCS_DIR, path.basename(storedPath));
        if (!filePath.startsWith(EMPLOYEE_DOCS_DIR + path.sep) || !fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: "File not found on server" });
        }

        const ext = path.extname(filePath).toLowerCase();
        res.setHeader("Content-Type", DOCUMENT_MIME[ext] || "application/octet-stream");
        res.setHeader("Content-Disposition", `inline; filename="${employee.employeeId}-${docKey}${ext}"`);
        res.setHeader("Cache-Control", "private, no-store");
        return fs.createReadStream(filePath).pipe(res);
    } catch (error) {
        return res.status(resolveStatusCode(error, 500)).json({
            success: false,
            message: error.statusCode === 404 ? error.message : "Server error while fetching document",
        });
    }
};

// (Re)send the password-setup invite; creates the login if missing
const sendEmployeeInvite = async (req, res) => {
    try {
        const { employee, created, rawToken } = await employeeService.prepareInvite(req.params.id);
        const result = await deliverInvite({ email: employee.email, name: employee.firstName, rawToken });
        if (!result.inviteSent) {
            return res.status(502).json({
                success: false,
                message: created
                    ? `Login created, but ${result.inviteError.charAt(0).toLowerCase()}${result.inviteError.slice(1)}`
                    : result.inviteError,
                data: { loginCreated: created },
            });
        }
        return res.status(200).json({
            success: true,
            message: `Invite sent to ${employee.email}`,
            data: { loginCreated: created },
        });
    } catch (error) {
        return res.status(resolveStatusCode(error, 500)).json({
            success: false,
            message: error.statusCode ? error.message : "Could not send invite",
        });
    }
};

// Profile page data — admin/HR or the employee themself
const getEmployeeOverview = async (req, res) => {
    try {
        if (!(await hasAdminAccess(req.user)) && !isOwnRecord(req.user, req.params.id)) {
            return res.status(403).json({ success: false, message: "You can only view your own profile" });
        }
        const data = await getEmployeeProfile(req.params.id);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(resolveStatusCode(error, 500)).json({
            success: false,
            message: error.statusCode ? error.message : "Could not load profile",
        });
    }
};

const AVATARS_DIR = path.resolve(__dirname, "../../uploads/avatars");
const removeAvatarFile = (storedPath) => {
    if (!storedPath) return;
    const filePath = path.resolve(AVATARS_DIR, path.basename(storedPath));
    if (filePath.startsWith(AVATARS_DIR + path.sep)) fs.promises.unlink(filePath).catch(() => {});
};

// Upload (multipart "avatar") or remove (DELETE) the profile photo — admin/HR or the employee themself
const updateEmployeeAvatar = async (req, res) => {
    const uploaded = req.file ? `/uploads/avatars/${req.file.filename}` : null;
    try {
        if (!(await hasAdminAccess(req.user)) && !isOwnRecord(req.user, req.params.id)) {
            if (uploaded) removeAvatarFile(uploaded);
            return res.status(403).json({ success: false, message: "You can only change your own photo" });
        }
        if (req.method !== "DELETE" && !uploaded) {
            return res.status(400).json({ success: false, message: "Choose a photo to upload" });
        }
        const employee = await employeeService.getEmployeeById(req.params.id);
        const previous = employee.avatar;
        employee.avatar = uploaded || "";
        await employee.save({ validateBeforeSave: false });
        if (previous && previous !== employee.avatar) removeAvatarFile(previous);
        return res.status(200).json({
            success: true,
            message: uploaded ? "Photo updated" : "Photo removed",
            data: { avatar: employee.avatar },
        });
    } catch (error) {
        if (uploaded) removeAvatarFile(uploaded);
        return res.status(resolveStatusCode(error, 500)).json({
            success: false,
            message: error.statusCode ? error.message : "Could not update photo",
        });
    }
};

// ─── Bulk import (rows already parsed from CSV on the client) ─────
const IMPORT_LIMIT = 500;
const EMPLOYEE_ENUMS = {
    department: Employee.schema.path("department").enumValues,
    employmentType: Employee.schema.path("employmentType").enumValues,
    gender: Employee.schema.path("gender").enumValues,
    status: Employee.schema.path("status").enumValues,
};

const validateImportRow = (row) => {
    const required = ["firstName", "lastName", "email", "phone", "department", "designation", "salary", "joiningDate"];
    const missing = required.filter((f) => !String(row[f] ?? "").trim());
    if (missing.length) return `Missing ${missing.join(", ")}`;
    if (!/^\S+@\S+\.\S+$/.test(row.email)) return "Invalid email";
    if (!/^\d{10}$/.test(String(row.phone).trim())) return "Phone must be 10 digits";
    if (Number.isNaN(Number(row.salary)) || Number(row.salary) < 0) return "Salary must be a number";
    for (const f of ["joiningDate", "dateOfBirth", "endingDate"]) {
        if (row[f] && Number.isNaN(Date.parse(row[f]))) return `${f} must be a date (YYYY-MM-DD)`;
    }
    for (const [field, values] of Object.entries(EMPLOYEE_ENUMS)) {
        if (row[field] && !values.includes(row[field])) return `${field} must be one of: ${values.join(", ")}`;
    }
    if (row.aadharNumber && !/^\d{12}$/.test(String(row.aadharNumber).trim())) return "Aadhaar must be 12 digits";
    if (row.panNumber && !/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/.test(String(row.panNumber).trim())) return "Invalid PAN format";
    return null;
};

const importEmployees = async (req, res) => {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
    if (!rows || rows.length === 0) {
        return res.status(400).json({ success: false, message: "No rows to import" });
    }
    if (rows.length > IMPORT_LIMIT) {
        return res.status(400).json({ success: false, message: `Import up to ${IMPORT_LIMIT} employees at a time` });
    }

    const results = [];
    // Sequential on purpose: keeps employee IDs in file order and duplicate checks accurate
    for (const [index, raw] of rows.entries()) {
        const row = Object.fromEntries(
            Object.entries(raw || {}).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])
        );
        const rowNumber = index + 2; // +1 for header, +1 for 1-based
        const problem = validateImportRow(row);
        if (problem) {
            results.push({ row: rowNumber, email: row.email || "", success: false, message: problem });
            continue;
        }
        try {
            const { employee } = await employeeService.createEmployee({
                ...row,
                panNumber: row.panNumber ? row.panNumber.toUpperCase() : row.panNumber,
                createLogin: false,
            });
            results.push({ row: rowNumber, email: employee.email, success: true, employeeId: employee.employeeId });
        } catch (error) {
            results.push({ row: rowNumber, email: row.email || "", success: false, message: error.message });
        }
    }

    const created = results.filter((r) => r.success).length;
    return res.status(200).json({
        success: true,
        message: `${created} of ${rows.length} employees imported`,
        data: { created, failed: rows.length - created, results },
    });
};

module.exports = {
    getEmployeeOverview,
    updateEmployeeAvatar,
    sendEmployeeInvite,
    importEmployees,
    getEmployeeSensitive,
    downloadEmployeeDocument,
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeeStats,
};