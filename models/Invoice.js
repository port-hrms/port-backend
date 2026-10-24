const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true },
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: "Quotation", default: null },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client", required: true },
    items: [
      {
        service: { type: String, required: true },
        description: { type: String, default: "" },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      },
    ],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0, min: 0 }, // received so far — used for "Partial"
    dueDate: { type: Date, required: true },
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Paid", "Partial", "Overdue"],
      default: "Unpaid",
    },
    transactionId: { type: String, default: "" },
    paymentDate: { type: Date, default: null },
    notes: { type: String, default: "" },
    pdfUrl: { type: String, default: "" },
    is_deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

invoiceSchema.pre("save", async function () {
  if (this.isNew) {
    const count = await mongoose.model("Invoice").countDocuments();
    this.invoiceNumber = `INV${String(count + 1).padStart(5, "0")}`;
  }
});

module.exports = mongoose.model("Invoice", invoiceSchema);
