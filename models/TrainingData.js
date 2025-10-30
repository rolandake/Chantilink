// src/models/TrainingData.js
import mongoose from "mongoose";

const TrainingDataSchema = new mongoose.Schema({
  input: { type: String, required: true },
  output: { type: String, required: true },
  projectType: { type: String, default: "generic" },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("TrainingData", TrainingDataSchema);
