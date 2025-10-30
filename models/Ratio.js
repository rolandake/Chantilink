// models/Ratio.js (MongoDB)
import mongoose from "mongoose";

const RatioSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  nom: String,
  ciment: Number,
  sable: Number,
  gravier: Number,
  eau: Number,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Ratio", RatioSchema);




