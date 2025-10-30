// models/FinitionCalc.js
import mongoose from "mongoose";

const FinitionCalcSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  data: { type: Object, required: true },
  coefPerte: { type: Number, default: 0 },
  devise: { type: String, default: "FCFA" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("FinitionCalc", FinitionCalcSchema);
