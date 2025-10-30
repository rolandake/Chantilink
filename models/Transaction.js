import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  offer: { type: mongoose.Schema.Types.ObjectId, ref: "Offer", required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ["pending", "completed", "cancelled"], default: "pending" },
});

export default mongoose.model("Transaction", transactionSchema);
