const fs = require("fs");
const path = require("path");

let logoBase64 = null;
let signatureBase64 = null;

try {
  const logoPath = path.join(__dirname, "../../assets/logo.png");
  if (fs.existsSync(logoPath)) {
    logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;
  }
} catch (e) {
  console.error("Failed to load logo image:", e);
}

try {
  const sigPath = path.join(__dirname, "../../assets/signature.png");
  if (fs.existsSync(sigPath)) {
    signatureBase64 = `data:image/png;base64,${fs.readFileSync(sigPath).toString("base64")}`;
  }
} catch (e) {
  console.error("Failed to load signature image:", e);
}

let templateBase64 = null;
try {
  const templatePath = path.join(__dirname, "../../assets/template.jpg");
  if (fs.existsSync(templatePath)) {
    templateBase64 = `data:image/jpeg;base64,${fs.readFileSync(templatePath).toString("base64")}`;
  }
} catch (e) {
  console.error("Failed to load template image:", e);
}

const COMPANY = {
  name: "Dreamonix Solution Pvt. Ltd.",
  address: "Plot No-222, District Center,\nBhubaneswar - 751001",
  gstin: "21AAMCB1486G1ZT",
  state: "Odisha",
  stateCode: "21",
  contact: "9348354248, 7978207390",
  bank: {
    holder: "Dreamonix Solution Pvt. Ltd.",
    bank: "HDFC Bank",
    account: "50200087663786",
    branch: "Infocity",
    ifsc: "HDFC0004013",
  },
};

function numberToWords(num) {
  if (num === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const convert = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  };
  return convert(Math.floor(num));
}

function drawBorder(doc, x, y, w, h) {
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(x, y, w, h);
}

module.exports = {
  logoBase64,
  signatureBase64,
  templateBase64,
  COMPANY,
  numberToWords,
  drawBorder,
};
