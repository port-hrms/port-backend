const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    clientId: { type: String, unique: true },
    name: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    gstNumber: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    is_deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

clientSchema.pre("save", async function () {
  if (this.isNew) {
    const count = await mongoose.model("Client").countDocuments();
    this.clientId = `CL${String(count + 1).padStart(4, "0")}`;
  }
});

module.exports = mongoose.model("Client", clientSchema);
