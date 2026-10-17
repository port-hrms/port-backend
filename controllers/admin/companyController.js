const CompanySetting = require("../../models/CompanySetting");
const { sendSuccess, sendError } = require("../../utils/responseHandler");

const getCompanySettings = async (req, res) => {
  try {
    let settings = await CompanySetting.findOne();
    if (!settings) {
      settings = await CompanySetting.create({});
    }
    return sendSuccess(res, settings);
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

const updateCompanySettings = async (req, res) => {
  try {
    let settings = await CompanySetting.findOne();
    if (!settings) {
      settings = new CompanySetting();
    }

    const { name, address, gstin, state, stateCode, contact, email, bank, logo, signature, latitude, longitude } = req.body;

    if (name) settings.name = name;
    if (address) settings.address = address;
    if (gstin) settings.gstin = gstin;
    if (state) settings.state = state;
    if (stateCode) settings.stateCode = stateCode;
    if (contact) settings.contact = contact;
    if (email) settings.email = email;
    if (bank) settings.bank = { ...settings.bank, ...bank };
    if (logo !== undefined) settings.logo = logo;
    if (signature !== undefined) settings.signature = signature;
    if (latitude !== undefined) settings.latitude = Number(latitude);
    if (longitude !== undefined) settings.longitude = Number(longitude);

    await settings.save();
    return sendSuccess(res, settings, "Company settings updated successfully");
  } catch (error) {
    return sendError(res, error.message, 500);
  }
};

module.exports = {
  getCompanySettings,
  updateCompanySettings,
};
