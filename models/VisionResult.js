import mongoose from "mongoose";

const VisionResultSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  description: { type: String, required: true },
  confidence: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("VisionResult", VisionResultSchema);




