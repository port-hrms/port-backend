const mongoose = require("mongoose");

const quotationItemSchema = new mongoose.Schema({
  service: { type: String },
  description: { type: String, default: "" },
  quantity: { type: Number, min: 0 },
  price: { type: Number, min: 0 },
});

const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: { type: String, unique: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    items: [quotationItemSchema],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    notes: { type: String, default: "" },
    termsAndConditions: {
      type: [String],
      default: [
        "50% advance payment is required to initiate the work.",
        "Balance payment to be cleared after completion of the work.",
        "GST will be charged extra as applicable.",
      ],
    },
    closingNote: {
      type: String,
      default:
        "Kindly share the payment confirmation once completed so we can proceed with the project initiation.\nPlease feel free to contact us for any clarification or confirmation.\nLooking forward to your approval.",
    },
    validTill: { type: Date, required: true },
    pdfUrl: { type: String, default: "" },
    is_deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

quotationSchema.pre("save", async function () {
  if (this.isNew) {
    const count = await mongoose.model("Quotation").countDocuments();
    this.quotationNumber = `QOT${String(count + 1).padStart(5, "0")}`;
  }
});

module.exports = mongoose.model("Quotation", quotationSchema);
