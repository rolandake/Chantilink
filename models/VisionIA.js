import mongoose from "mongoose";

const visionIASchema = new mongoose.Schema({
  image: { type: String, required: true },
  analysisResult: { type: String, required: true }, // exemple : résumé des analyses
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

const VisionIA = mongoose.model("VisionIA", visionIASchema);
export default VisionIA;




