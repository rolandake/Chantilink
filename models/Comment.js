import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    content: { type: String, required: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation" },
    status: { type: mongoose.Schema.Types.ObjectId, ref: "Status" },
  },
  { timestamps: true }
);

export default mongoose.model("Comment", commentSchema);
