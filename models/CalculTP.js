// backend/models/CalculTP.js
import mongoose from "mongoose";

const calculTPSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: String, // "chaussée", "pente", etc.
  inputs: Object,
  results: Object,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("CalculTP", calculTPSchema);




