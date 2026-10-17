const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const CompanySetting = require("../models/CompanySetting");

// SHA-256 of the old bundled Briskode logo. Records still carrying it get their logo cleared;
// logos uploaded through Settings are left untouched.
const LEGACY_LOGO_SHA256 = "37caa2cd2aca89328c7b8bd4b796a721be2b427a254e037f8e96f3bd55020b14";

const isLegacyLogo = (dataUrl) => {
  if (typeof dataUrl !== "string" || !dataUrl.includes("base64,")) return false;
  const bytes = Buffer.from(dataUrl.split("base64,")[1], "base64");
  return crypto.createHash("sha256").update(bytes).digest("hex") === LEGACY_LOGO_SHA256;
};

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

      const withLogo = await CompanySetting.find({ logo: { $nin: ["", null] } }).select("logo");
      for (const doc of withLogo) {
        if (isLegacyLogo(doc.logo)) {
          await CompanySetting.updateOne({ _id: doc._id }, { $set: { logo: "" } });
          console.log("Removed legacy Briskode logo from company settings");
        }
      }
      return;
    }

    console.log("Seeding default company settings...");
    let signatureBase64 = "";

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
      logo: "",
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
