const mongoose = require("mongoose");

const companySettingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, default: "Briskode Technology Pvt. Ltd." },
    address: { type: String, required: true, default: "Plot No-222, District Center,\nBhubaneswar - 751001" },
    gstin: { type: String, required: true, default: "21AAMCB1486G1ZT" },
    state: { type: String, required: true, default: "Odisha" },
    stateCode: { type: String, default: "21" },
    contact: { type: String, required: true, default: "9348354248, 8117856483" },
    email: { type: String, default: "briskodetechnology@gmail.com" },
    hrEmail: { type: String, default: "hr@briskodetechnology.com" },
    bank: {
      holder: { type: String, default: "Briskode Technology Pvt. Ltd." },
      bank: { type: String, default: "HDFC Bank" },
      account: { type: String, default: "50200087663786" },
      branch: { type: String, default: "Infocity" },
      ifsc: { type: String, default: "HDFC0004013" },
    },
    logo: { type: String, default: "" }, // Base64 string
    signature: { type: String, default: "" }, // Base64 string
    latitude: { type: Number, default: 20.296059 },
    longitude: { type: Number, default: 85.824539 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CompanySetting", companySettingSchema);
