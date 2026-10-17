// @ts-nocheck

const employeeService = require("../../services/employee/employeeService");
const Employee = require("../../models/Employee");
const resolveStatusCode = (error, fallback = 500) => error?.statusCode || fallback;

const getAllEmployees = async (req, res) => {
    try {
        let employees = await employeeService.getAllEmployees(req.query);
        
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

        if (shouldFilter) {
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
        const employee = await employeeService.getEmployeeById(req.params.id);
        return res.status(200).json({
            success: true,
            data: employee,
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

        const { employee, loginCreated, message } = await employeeService.createEmployee({
            ...req.body,
            documents,
        });
        return res.status(201).json({
            success: true,
            message,
            data: {
                ...employee.toObject(),
                loginCreated,
            },
        });
    } catch (error) {
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

        const updateData = { ...req.body };
        
        // Map bank fields to structured bankInfo object
        const bankFields = ["bankName", "accountNumber", "ifscCode", "panNumber", "pfNumber", "pfUAN"];
        bankFields.forEach(field => {
            if (updateData[field] !== undefined) {
                updateData[`bankInfo.${field}`] = updateData[field];
                delete updateData[field];
            }
        });

        if (Object.keys(documents).length > 0) {
            Object.entries(documents).forEach(([key, value]) => {
                updateData[`documents.${key}`] = value;
            });
        }

        const updatedEmployee = await employeeService.updateEmployee(req.params.id, updateData);
        return res.status(200).json({
            success: true,
            message: `Employee ${updatedEmployee.firstName} ${updatedEmployee.lastName} updated successfully`,
            data: updatedEmployee,
        });
    } catch (error) {
        return res.status(resolveStatusCode(error, 400)).json({
            success: false,
            message: "Error updating employee",
            error: error.message,
        });
    }
};

const deleteEmployee = async (req, res) => {
    try {
        const employee = await employeeService.deleteEmployee(req.params.id);
        return res.status(200).json({
            success: true,
            message: `Employee ${employee.firstName} ${employee.lastName} deleted successfully`,
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

module.exports = {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeeStats,
};