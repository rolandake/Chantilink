import mongoose from "mongoose";

const HistorySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  projectType: String,
  plans: Array,
  messages: [
    {
      role: String,
      content: String,
    },
  ],
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model("History", HistorySchema);
