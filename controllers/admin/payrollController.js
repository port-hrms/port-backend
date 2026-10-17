// @ts-nocheck

const payrollService = require("../../services/payroll/payrollService");

const resolveStatusCode = (error, fallback = 500) => error?.statusCode || fallback;

const getPayrolls = async (req, res) => {
  try {
    const { payrolls, count } = await payrollService.getPayrolls(req.query, req.user);

    return res.status(200).json({
      success: true,
      count,
      data: payrolls,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error, 500)).json({
      success: false,
      message: "Error fetching payroll records",
      error: error.message,
    });
  }
};

const getPayrollById = async (req, res) => {
  try {
    const payroll = await payrollService.getPayrollById(req.params.id);
    return res.status(200).json({ success: true, data: payroll });
  } catch (error) {
    return res.status(resolveStatusCode(error, 500)).json({
      success: false,
      message: "Error fetching payroll record",
      error: error.message,
    });
  }
};

const generatePayroll = async (req, res) => {
  try {
    const { payroll, message, isUpdated } = await payrollService.generatePayroll(req.body);
    return res.status(isUpdated ? 200 : 201).json({
      success: true,
      message,
      data: payroll,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Payroll already exists for this employee and month",
      });
    }

    return res.status(resolveStatusCode(error, 400)).json({
      success: false,
      message: "Error generating payroll",
      error: error.message,
    });
  }
};

const runPayrollForAll = async (req, res) => {
  try {
    const { message, results } = await payrollService.runPayrollForAll(req.body);
    return res.status(201).json({
      success: true,
      message,
      data: results,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error, 500)).json({
      success: false,
      message: "Error running bulk payroll",
      error: error.message,
    });
  }
};

const updatePayroll = async (req, res) => {
  try {
    const payroll = await payrollService.updatePayroll(req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: "Payroll updated successfully",
      data: payroll,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error, 400)).json({
      success: false,
      message: "Error updating payroll",
      error: error.message,
    });
  }
};

const markAsPaid = async (req, res) => {
  try {
    const payroll = await payrollService.markAsPaid(req.params.id, req.body.paymentMethod);
    return res.status(200).json({
      success: true,
      message: `Payroll marked as paid for ${payroll.employee.firstName} ${payroll.employee.lastName}`,
      data: payroll,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error, 400)).json({
      success: false,
      message: "Error marking payroll as paid",
      error: error.message,
    });
  }
};

const deletePayroll = async (req, res) => {
  try {
    await payrollService.deletePayroll(req.params.id);
    return res.status(200).json({
      success: true,
      message: "Payroll record deleted successfully",
      data: {},
    });
  } catch (error) {
    return res.status(resolveStatusCode(error, 500)).json({
      success: false,
      message: "Error deleting payroll record",
      error: error.message,
    });
  }
};

const getPayrollStats = async (req, res) => {
  try {
    const stats = await payrollService.getPayrollStats(req.query);
    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    return res.status(resolveStatusCode(error, 500)).json({
      success: false,
      message: "Error fetching payroll stats",
      error: error.message,
    });
  }
};

const getRazorpayInstance = require("../../config/razorpay");
const crypto = require("crypto");
const Payroll = require("../../models/Payroll");

const createRazorpayOrder = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res.status(404).json({ success: false, message: "Payroll record not found" });
    }

    if (payroll.payment?.status === "Paid") {
      return res.status(400).json({ success: false, message: "Payroll is already paid" });
    }

    const gross = Number(payroll.earnings?.basic || 0) + Number(payroll.earnings?.hra || 0) + Number(payroll.earnings?.bonus || 0);
    const totalDeductions = Number(payroll.deductions?.pf || 0) + Number(payroll.deductions?.ptax || 0) + Number(payroll.deductions?.esi || 0) + Number(payroll.deductions?.leaveDeduction || 0);
    const net = gross - totalDeductions;

    if (net <= 0) {
      return res.status(400).json({ success: false, message: "Net payable must be greater than 0" });
    }

    const options = {
      amount: Math.round(net * 100), // in paise
      currency: "INR",
      receipt: `pay_${payroll._id}`,
    };

    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      success: true,
      key_id: process.env.RAZORPAY_KEY_ID,
      order,
    });
  } catch (error) {
    console.error("[Razorpay Order Error]", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create Razorpay order",
      error: error?.error?.description || error?.message || "Unknown error",
      razorpayError: error?.error || null,
    });
  }
};

const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required",
      });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed. Invalid signature.",
      });
    }

    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      {
        "payment.status": "Paid",
        "payment.date": new Date(),
        "payment.mode": "Razorpay",
        "payment.razorpayOrderId": razorpay_order_id,
        "payment.razorpayPaymentId": razorpay_payment_id,
        "payment.razorpaySignature": razorpay_signature,
      },
      { new: true }
    ).populate("employee", "firstName lastName employeeId");

    if (!payroll) {
      return res.status(404).json({ success: false, message: "Payroll record not found" });
    }

    return res.status(200).json({
      success: true,
      message: `Payroll payment processed successfully via Razorpay for ${payroll.employee.firstName} ${payroll.employee.lastName}`,
      data: payroll,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error verifying Razorpay payment",
      error: error.message,
    });
  }
};

module.exports = {
  getPayrolls,
  getPayrollById,
  generatePayroll,
  runPayrollForAll,
  updatePayroll,
  markAsPaid,
  deletePayroll,
  getPayrollStats,
  createRazorpayOrder,
  verifyRazorpayPayment,
};
