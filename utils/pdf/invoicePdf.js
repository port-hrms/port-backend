const { jsPDF } = require("jspdf");
require("jspdf-autotable");
const { logoBase64, signatureBase64, COMPANY, numberToWords } = require("./assets");

const generateInvoicePDF = (invoice, companyInfo) => {
  const client = invoice.clientId || {};
  const items = invoice.items || [];
  const COMPANY_DATA = companyInfo || COMPANY;
  const logoData = (companyInfo && companyInfo.logo) ? companyInfo.logo : logoBase64;
  const signatureData = (companyInfo && companyInfo.signature) ? companyInfo.signature : signatureBase64;
  const subtotal = invoice.subtotal !== undefined ? invoice.subtotal : items.reduce((s, i) => s + (i.quantity || 0) * (i.price || 0), 0);
  const tax = invoice.tax || Math.round(subtotal * 0.18);
  const discount = invoice.discount || 0;
  const grandTotal = subtotal + tax - discount;

  const invoiceDate = invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN");
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN") : "";

  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentW = pw - margin * 2;

  let y = margin;

  // Outer border
  doc.setDrawColor(0);
  doc.setLineWidth(1);
  doc.rect(margin, y, contentW, ph - margin * 2);

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("TAX INVOICE", pw / 2, y + 10, { align: "center" });

  // Divider under title
  doc.setLineWidth(0.5);
  doc.line(margin, y + 13, pw - margin, y + 13);

  // ─── Header Row: Left (Company) + Right (Invoice Meta) ───
  const headerY = y + 13;
  const colMid = pw / 2;
  const rowH = 58;

  // Left column border
  doc.setLineWidth(0.5);
  doc.line(colMid, headerY, colMid, headerY + rowH);

  // Right column - small table cells
  const metaData = [
    ["Invoice No.", invoice.invoiceNumber || ""],
    ["Invoice Date", invoiceDate],
    ["Delivery Note", ""],
    ["Mode/Terms of Payment", ""],
    ["Reference No. & Date", ""],
    ["Buyer's Order No.", ""],
    ["Dispatch Doc No.", ""],
    ["Destination", client.address || ""],
    ["Terms of Delivery", ""],
  ];
  const cellH = rowH / metaData.length;
  metaData.forEach(([label, value], i) => {
    const cy = headerY + i * cellH;
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    // horizontal lines
    doc.line(colMid, cy + cellH, pw - margin, cy + cellH);
    // vertical separator
    doc.line(colMid + (pw - margin - colMid) * 0.35, cy, colMid + (pw - margin - colMid) * 0.35, cy + cellH);
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text(label, colMid + 1, cy + cellH - 1.5);
    doc.setFont("helvetica", "normal");
    doc.text(value, colMid + (pw - margin - colMid) * 0.35 + 1, cy + cellH - 1.5);
  });

  // Company info (left side)
  let companyTextY = headerY + 5;
  if (logoData) {
    // Render logo on the left (25mm wide, 6mm high)
    doc.addImage(logoData, "PNG", margin + 2, headerY + 3, 25, 6);
    
    // Render company details on the right of the logo
    const textX = margin + 29;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text(COMPANY_DATA.name, textX, headerY + 6);
    
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    const addrLines = (COMPANY_DATA.address || "").split("\n");
    addrLines.forEach((line, i) => {
      doc.text(line, textX, headerY + 10 + i * 3.5);
    });
    
    const offset = headerY + 10 + addrLines.length * 3.5;
    
    doc.setFont("helvetica", "bold");
    doc.text(`GSTIN/UIN:`, textX, offset);
    doc.setFont("helvetica", "normal");
    doc.text(COMPANY_DATA.gstin, textX + 13, offset);
    
    doc.setFont("helvetica", "bold");
    doc.text(`State Name:`, textX, offset + 4);
    doc.setFont("helvetica", "normal");
    doc.text(`${COMPANY_DATA.state || ""}, `, textX + 14, offset + 4);
    
    const contactXOffset = textX + 14 + doc.getTextWidth(`${COMPANY_DATA.state || ""}, `);
    doc.setFont("helvetica", "bold");
    doc.text(`Contact:`, contactXOffset, offset + 4);
    doc.setFont("helvetica", "normal");
    doc.text(COMPANY_DATA.contact || "", contactXOffset + 10, offset + 4);
  } else {
    // Fallback: render text without logo starting at margin + 2
    const textX = margin + 2;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text(COMPANY_DATA.name, textX, headerY + 6);
    
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    const addrLines = (COMPANY_DATA.address || "").split("\n");
    addrLines.forEach((line, i) => {
      doc.text(line, textX, headerY + 11 + i * 3.5);
    });
    
    const offset = headerY + 11 + addrLines.length * 3.5;
    
    doc.setFont("helvetica", "bold");
    doc.text(`GSTIN/UIN:`, textX, offset + 1);
    doc.setFont("helvetica", "normal");
    doc.text(COMPANY_DATA.gstin, textX + 13, offset + 1);
    
    doc.setFont("helvetica", "bold");
    doc.text(`State Name:`, textX, offset + 5);
    doc.setFont("helvetica", "normal");
    doc.text(`${COMPANY_DATA.state || ""}, `, textX + 14, offset + 5);
    
    const contactXOffset = textX + 14 + doc.getTextWidth(`${COMPANY_DATA.state || ""}, `);
    doc.setFont("helvetica", "bold");
    doc.text(`Contact:`, contactXOffset, offset + 5);
    doc.setFont("helvetica", "normal");
    doc.text(COMPANY_DATA.contact || "", contactXOffset + 10, offset + 5);
  }

  y = headerY + rowH;
  doc.setLineWidth(0.5);
  doc.line(margin, y, pw - margin, y);

  // ─── Consignee / Buyer ───
  const custH = 18;
  doc.line(colMid, y, colMid, y + custH);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Consignee (Ship To)", margin + 2, y + 4);
  doc.setFont("helvetica", "bold");
  doc.text((client.companyName || "").toUpperCase(), margin + 2, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`GSTIN/UIN: ${client.gstNumber || ""}`, margin + 2, y + 14);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Buyer (Bill To)", colMid + 2, y + 4);
  doc.setFont("helvetica", "bold");
  doc.text((client.companyName || "").toUpperCase(), colMid + 2, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(client.address || "", colMid + 2, y + 14);

  y += custH;
  doc.line(margin, y, pw - margin, y);

  // ─── Items Table ───
  const tableColumns = ["Sl No", "Description of Item", "HSN/SAC", "Quantity", "Rate", "Per", "Amount"];
  const tableBody = items.map((item, i) => [
    i + 1,
    item.service + (item.description ? ` - ${item.description}` : ""),
    item.hsnSac || "\u2014",
    item.quantity,
    `Rs. ${item.price.toLocaleString("en-IN")}`,
    item.per || "Nos",
    `Rs. ${(item.quantity * item.price).toLocaleString("en-IN")}`,
  ]);

  // Add empty rows to fill space if less than 5 items
  const minRows = 5;
  for (let i = items.length; i < minRows; i++) {
    tableBody.push(["", "", "", "", "", "", ""]);
  }

  doc.autoTable({
    startY: y + 0.5,
    head: [tableColumns],
    body: tableBody,
    theme: "grid",
    headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: "bold", fontSize: 7, halign: "center" },
    styles: { fontSize: 7, cellPadding: 0.8, lineColor: 0, lineWidth: 0.3 },
    columnStyles: {
      0: { halign: "center" },
      2: { halign: "center" },
      3: { halign: "center" },
      4: { halign: "right" },
      5: { halign: "center" },
      6: { halign: "right" },
    },
    margin: { left: margin, right: margin },
  });

  y = doc.lastAutoTable.finalY;

  // ─── Bottom Section: Left (Amount in Words + Declaration) / Right (Tax Summary) ───
  doc.setLineWidth(0.5);
  doc.line(margin, y, pw - margin, y);

  const bottomH = 45;
  doc.line(colMid, y, colMid, y + bottomH);

  // Left side
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Amount in Words", margin + 2, y + 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(`INR ${numberToWords(grandTotal)} Only`, margin + 2, y + 9);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Declaration", margin + 2, y + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.text("We declare that this invoice shows the actual price of the", margin + 2, y + 21);
  doc.text("goods/services described and that all particulars are true", margin + 2, y + 25);
  doc.text("and correct.", margin + 2, y + 29);

  // Right side - tax summary
  const taxLines = [
    { label: "Taxable Amount", value: `Rs. ${subtotal.toLocaleString("en-IN")}` },
    { label: "GST 18%", value: `Rs. ${tax.toLocaleString("en-IN")}` },
  ];
  if (discount > 0) {
    taxLines.push({ label: "Discount", value: `-Rs. ${discount.toLocaleString("en-IN")}` });
  }

  let ty = y + 4;
  doc.setFontSize(7);
  taxLines.forEach((line) => {
    doc.setFont("helvetica", "normal");
    doc.text(line.label, colMid + 2, ty);
    doc.setFont("helvetica", "bold");
    doc.text(line.value, pw - margin - 2, ty, { align: "right" });
    ty += 5;
  });

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(colMid + 2, ty + 0.5, pw - margin - 2, ty + 0.5);
  ty += 3;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Grand Total", colMid + 2, ty);
  doc.text(`Rs. ${grandTotal.toLocaleString("en-IN")}`, pw - margin - 2, ty, { align: "right" });

  y += bottomH;
  doc.line(margin, y, pw - margin, y);

  // ─── Bank Details / Signature ───
  const footerH = 24;
  doc.line(colMid, y, colMid, y + footerH);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Bank Details", margin + 2, y + 4);

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  const bankLines = [
    `Account Holder : ${(COMPANY_DATA.bank && COMPANY_DATA.bank.holder) || ""}`,
    `Bank Name      : ${(COMPANY_DATA.bank && COMPANY_DATA.bank.bank) || ""}`,
    `Account No.    : ${(COMPANY_DATA.bank && COMPANY_DATA.bank.account) || ""}`,
    `Branch & IFSC  : ${(COMPANY_DATA.bank && COMPANY_DATA.bank.branch) || ""} | ${(COMPANY_DATA.bank && COMPANY_DATA.bank.ifsc) || ""}`,
  ];
  bankLines.forEach((line, i) => {
    doc.text(line, margin + 2, y + 9 + i * 4);
  });

  // Signature
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`for ${COMPANY_DATA.name}`, pw - margin - 2, y + 6, { align: "right" });

  if (signatureData) {
    doc.addImage(signatureData, "PNG", pw - margin - 27, y + 8, 25, 10);
  }

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Authorized Signatory", pw - margin - 2, y + footerH - 3, { align: "right" });

  return Buffer.from(doc.output("arraybuffer"));
};

module.exports = {
  generateInvoicePDF,
};
