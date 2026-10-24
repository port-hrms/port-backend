// @ts-nocheck

const Payroll = require("../../models/Payroll");
const Employee = require("../../models/Employee");
const { withStatus } = require("./payrollSharedService");
const { missingBankDetails } = require("../../utils/employeeHelpers");

// A bank-transfer payout needs the employee's account number and IFSC on file
const assertCanPayByBank = async (employeeId, mode) => {
  if (mode !== "Bank Transfer") return;
  const employee = await Employee.findById(employeeId).select("firstName lastName bankInfo");
  const missing = missingBankDetails(employee);
  if (missing.length > 0) {
    throw withStatus(
      `Cannot pay ${employee?.firstName || "this employee"} by bank transfer — missing ${missing.join(" and ")}. Complete their bank details in Employees first.`,
      400
    );
  }
};

const updatePayroll = async (id, payload) => {
  const payroll = await Payroll.findById(id);

  if (!payroll) {
    throw withStatus("Payroll record not found", 404);
  }

  const nextPayload = { ...payload };

  if (nextPayload.status || nextPayload.paymentMethod || nextPayload.paymentDate) {
    nextPayload.payment = {
      ...(payroll.payment || {}),
      ...(nextPayload.payment || {}),
      ...(nextPayload.status ? { status: nextPayload.status } : {}),
      ...(nextPayload.paymentMethod ? { mode: nextPayload.paymentMethod } : {}),
      ...(nextPayload.paymentDate ? { date: nextPayload.paymentDate } : {}),
    };
    delete nextPayload.status;
    delete nextPayload.paymentMethod;
    delete nextPayload.paymentDate;
  }

  const becomesPaid = nextPayload.payment?.status === "Paid" && payroll.payment?.status !== "Paid";
  if (becomesPaid) {
    await assertCanPayByBank(payroll.employee, nextPayload.payment.mode);
  }

  Object.assign(payroll, nextPayload);
  await payroll.save();
  await payroll.populate("employee", "firstName lastName employeeId department");

  return payroll;
};

const markAsPaid = async (id, paymentMethod = "Bank Transfer") => {
  const existing = await Payroll.findById(id).select("employee");
  if (!existing) {
    throw withStatus("Payroll record not found", 404);
  }
  await assertCanPayByBank(existing.employee, paymentMethod);

  const payroll = await Payroll.findByIdAndUpdate(
    id,
    {
      "payment.status": "Paid",
      "payment.date": new Date(),
      "payment.mode": paymentMethod,
    },
    { new: true }
  ).populate("employee", "firstName lastName employeeId");

  if (!payroll) {
    throw withStatus("Payroll record not found", 404);
  }

  return payroll;
};

const deletePayroll = async (id) => {
  const payroll = await Payroll.findByIdAndDelete(id);

  if (!payroll) {
    throw withStatus("Payroll record not found", 404);
  }

  return true;
};

module.exports = {
  updatePayroll,
  markAsPaid,
  deletePayroll,
};
