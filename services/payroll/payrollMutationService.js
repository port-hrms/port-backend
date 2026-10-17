// @ts-nocheck

const Payroll = require("../../models/Payroll");
const { withStatus } = require("./payrollSharedService");

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

  Object.assign(payroll, nextPayload);
  await payroll.save();
  await payroll.populate("employee", "firstName lastName employeeId department");

  return payroll;
};

const markAsPaid = async (id, paymentMethod = "Bank Transfer") => {
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
