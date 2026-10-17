const { jsPDF } = require("jspdf");
const { signatureBase64, templateBase64 } = require("./assets");

const generateQuotationPDF = (quotation, companyInfo) => {
  const client = quotation.clientId || {};
  const items = quotation.items || [];
  const signatureData = (companyInfo && companyInfo.signature) ? companyInfo.signature : signatureBase64;

  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  // Register page background event for multi-page layouts
  doc.internal.events.subscribe("addPage", () => {
    if (templateBase64) {
      doc.addImage(templateBase64, "JPEG", 0, 0, pw, ph);
    }
  });

  // Draw background template on the first page
  if (templateBase64) {
    doc.addImage(templateBase64, "JPEG", 0, 0, pw, ph);
  }

  // 1. Render Quotation Date and Number
  const quotationDate = quotation.createdAt ? new Date(quotation.createdAt).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN");

  // Mask pre-baked 'BRS/016' on the template image
  doc.setFillColor(255, 255, 255);
  doc.rect(174, 42, 20, 6, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0); // Pure black
  doc.text(quotationDate, 173, 35.2);
  doc.text(quotation.quotationNumber || "", 174, 44.2);

  // 2. Render Text Content (Helvetica Font)
  let y = 65;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text("Dear Sir/Madam,", 18, y);
  y += 6;

  const companyName = (companyInfo && companyInfo.name) || "Briskode Technology Pvt Ltd";
  doc.text(`Greetings from ${companyName}.`, 18, y);
  y += 9;

  doc.text("Please find below the quotation details for the required materials and service work:", 18, y);
  y += 8;

  // 3. Render Plain Text Columns (Items)
  doc.setFont("helvetica", "bold");
  doc.text("Sl. No", 18, y);
  doc.text("Description", 32, y);
  doc.text("Qty", 135, y);
  doc.text("Price", 168, y);
  y += 6;

  doc.setFont("helvetica", "normal");

  // Compute Totals
  const subtotal = quotation.subtotal || items.reduce((s, i) => s + (i.quantity || 0) * (i.price || 0), 0);
  const tax = quotation.tax || 0;
  const discount = quotation.discount || 0;
  const grandTotal = quotation.total || (subtotal + tax - discount);

  items.forEach((item, index) => {
    doc.text(String(index + 1), 18, y);

    let desc = item.service;
    if (item.description) {
      desc += ` - ${item.description}`;
    }

    const wrappedDesc = doc.splitTextToSize(desc, 95);
    const qtyText = `${item.quantity} Nos`;
    const priceText = `Rs. ${(item.quantity * item.price).toLocaleString("en-IN")}`;

    doc.text(wrappedDesc[0] || "", 32, y);
    doc.text(qtyText, 135, y);
    doc.text(priceText, 168, y);
    y += 5.5;

    for (let i = 1; i < wrappedDesc.length; i++) {
      doc.text(wrappedDesc[i], 32, y);
      y += 5.5;
    }
  });
  y += 4;

  // 4. Totals, GST Note, and Terms
  doc.setFont("helvetica", "bold");
  doc.text(`Total Amount: Rs. ${grandTotal.toLocaleString("en-IN")}/-`, 18, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.text("Note: GST will be charged extra as applicable.", 18, y);
  y += 10;

  if (quotation.notes) {
    doc.setFont("helvetica", "bold");
    doc.text("Notes:", 18, y);
    y += 5.5;
    doc.setFont("helvetica", "normal");
    const wrappedNotes = doc.splitTextToSize(quotation.notes, 175);
    wrappedNotes.forEach((line) => {
      doc.text(line, 18, y);
      y += 5.5;
    });
    y += 4.5;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Terms & Conditions:", 18, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  const terms = quotation.termsAndConditions || [
    "50% advance payment is required to initiate the work.",
    "Balance payment to be cleared after completion of the work.",
    "GST will be charged extra as applicable.",
  ];
  terms.forEach((term) => {
    doc.text(`•  ${term}`, 22, y);
    y += 5.5;
  });
  y += 4;

  // 5. Bank details (dynamically from settings or fallback)
  doc.setFont("helvetica", "bold");
  doc.text("Bank Account Details for Payment:", 18, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  const holder = (companyInfo && companyInfo.bank && companyInfo.bank.holder) || "BRISKODE TECHNOLOGY PVT LTD";
  const account = (companyInfo && companyInfo.bank && companyInfo.bank.account) || "50200087663786";
  const ifsc = (companyInfo && companyInfo.bank && companyInfo.bank.ifsc) || "HDFC0004013";

  doc.text(`A/C Name: ${holder}`, 18, y);
  y += 5.5;
  doc.text(`A/C No: ${account}`, 18, y);
  y += 5.5;
  doc.text(`IFSC Code: ${ifsc}`, 18, y);
  y += 10;

  // 6. Footer closing lines
  const closingNote = quotation.closingNote ||
    "Kindly share the payment confirmation once completed so we can proceed with the project initiation.\nPlease feel free to contact us for any clarification or confirmation.\nLooking forward to your approval.";
  closingNote.split("\n").forEach((line) => {
    doc.text(line, 18, y);
    y += 5.5;
  });

  // 7. Signature (Bottom Left, above Thanks & Regards)
  const sigY = 249;
  if (signatureData) {
    doc.addImage(signatureData, "PNG", 18, sigY - 9, 20, 8);
  }
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.line(18, sigY, 50, sigY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Authorized Signature", 18, sigY + 4, { align: "left" });

  return Buffer.from(doc.output("arraybuffer"));
};

module.exports = {
  generateQuotationPDF,
};
