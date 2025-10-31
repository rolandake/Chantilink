import mongoose from "mongoose";

const gptMessageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true } // createdAt / updatedAt
);

export default mongoose.model("GptMessage", gptMessageSchema);
