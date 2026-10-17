const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendQuotationEmail = async ({ to, subject, text, pdfBuffer, filename }) => {
  const mailOptions = {
    from: `"${process.env.COMPANY_NAME || "Company"}" <${process.env.EMAIL_USER}>`,
    to,
    subject: subject || "Quotation from Company",
    text: text || `Dear Client,\n\nPlease find attached the quotation for your requested services.\n\nRegards,\n${process.env.COMPANY_NAME || "Company"}`,
    attachments: pdfBuffer
      ? [{ filename: filename || "quotation.pdf", content: pdfBuffer, encoding: "base64" }]
      : [],
  };

  return transporter.sendMail(mailOptions);
};

const sendInvoiceEmail = async ({ to, subject, text, pdfBuffer, filename }) => {
  const mailOptions = {
    from: `"${process.env.COMPANY_NAME || "Company"}" <${process.env.EMAIL_USER}>`,
    to,
    subject: subject || "Invoice from Company",
    text: text || `Dear Client,\n\nPlease find attached the invoice for your reference.\n\nRegards,\n${process.env.COMPANY_NAME || "Company"}`,
    attachments: pdfBuffer
      ? [{ filename: filename || "invoice.pdf", content: pdfBuffer, encoding: "base64" }]
      : [],
  };

  return transporter.sendMail(mailOptions);
};

const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const mailOptions = {
    from: `"${process.env.COMPANY_NAME || "HRMS"}" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Password Reset Request — Action Required",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 32px 40px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">Password Reset</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">${process.env.COMPANY_NAME || "HRMS"}</p>
        </div>
        <div style="padding: 36px 40px;">
          <p style="color: #1e293b; font-size: 16px; margin: 0 0 8px;">Hi <strong>${name || "there"}</strong>,</p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
            We received a request to reset your HRMS account password. Click the button below to set a new password.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 15px; font-weight: 600; letter-spacing: 0.2px;">Reset My Password &rarr;</a>
          </div>
          <div style="background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 12px 16px; margin: 24px 0 0;">
            <p style="color: #78350f; font-size: 13px; margin: 0;">⏰ This link expires in <strong>15 minutes</strong>. If you didn't request this, you can safely ignore this email.</p>
          </div>
        </div>
        <div style="background: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} ${process.env.COMPANY_NAME || "HRMS"} &mdash; This is an automated email, please do not reply.</p>
        </div>
      </div>
    `,
  };
  return transporter.sendMail(mailOptions);
};

module.exports = { sendQuotationEmail, sendInvoiceEmail, sendPasswordResetEmail };
