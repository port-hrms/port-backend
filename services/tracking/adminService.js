// @ts-nocheck
const Tracking = require("../../models/Tracking");
const Employee = require("../../models/Employee");

const toggleFieldAgent = async (employeeId) => {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
        const error = new Error("Employee not found");
        error.statusCode = 404;
        throw error;
    }

    if (!employee.isFieldAgent && employee.department !== "Marketing" && employee.department !== "Sales") {
        const error = new Error("Only employees from Marketing or Sales departments can be field agents");
        error.statusCode = 400;
        throw error;
    }

    employee.isFieldAgent = !employee.isFieldAgent;
    await employee.save({ validateBeforeSave: false });
    return employee;
};

const deleteTracking = async (id) => {
    const record = await Tracking.findByIdAndDelete(id);
    if (!record) {
        const error = new Error("Record not found");
        error.statusCode = 404;
        throw error;
    }
    return record;
};

module.exports = {
    toggleFieldAgent,
    deleteTracking,
};
