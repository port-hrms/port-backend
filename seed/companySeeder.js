const fs = require("fs");
const path = require("path");
const CompanySetting = require("../models/CompanySetting");

const seedCompanyDetails = async () => {
  try {
    const count = await CompanySetting.countDocuments();
    if (count > 0) {
      await CompanySetting.updateMany(
        {},
        {
          $set: {
            contact: "9348354248, 8117856483",
            email: "dreamonixsolution@gmail.com",
            hrEmail: "hr@dreamonixsolution.com",
          }
        }
      );
      return;
    }

    console.log("Seeding default company settings...");
    let logoBase64 = "";
    let signatureBase64 = "";

    try {
      const logoPath = path.join(__dirname, "../assets/logo.png");
      if (fs.existsSync(logoPath)) {
        logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`;
      }
    } catch (e) {
      console.error("Failed to seed default logo:", e);
    }

    try {
      const sigPath = path.join(__dirname, "../assets/signature.png");
      if (fs.existsSync(sigPath)) {
        signatureBase64 = `data:image/png;base64,${fs.readFileSync(sigPath).toString("base64")}`;
      }
    } catch (e) {
      console.error("Failed to seed default signature:", e);
    }

    await CompanySetting.create({
      name: "Dreamonix Solution Pvt. Ltd.",
      address: "Plot No-222, District Center,\nBhubaneswar - 751001",
      gstin: "21AAMCB1486G1ZT",
      state: "Odisha",
      stateCode: "21",
      contact: "9348354248, 8117856483",
      email: "dreamonixsolution@gmail.com",
      hrEmail: "hr@dreamonixsolution.com",
      bank: {
        holder: "Dreamonix Solution Pvt. Ltd.",
        bank: "HDFC Bank",
        account: "50200087663786",
        branch: "Infocity",
        ifsc: "HDFC0004013",
      },
      logo: logoBase64,
      signature: signatureBase64,
      latitude: 20.324367783337756,
      longitude: 85.81697911680222,
    });
    console.log("Seeding default company settings completed! ✅");
  } catch (error) {
    console.error("Failed to seed default company settings:", error.message);
  }
};

module.exports = {
  seedCompanyDetails,
};
