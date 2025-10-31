import mongoose from "mongoose";

const PlanSchema = new mongoose.Schema({
  filename: String,
  etapes: Object,
  materiaux: Array,
  mainOeuvre: Number,
  coutTotal: Number,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Plan", PlanSchema);
