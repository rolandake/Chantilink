import mongoose from "mongoose";

const PlanSchema = new mongoose.Schema({
  name: String,
  url: String,
});

const ChatSchema = new mongoose.Schema({
  role: String,
  content: String,
});

const ProjectSchema = new mongoose.Schema({
  projectType: { type: String, required: true },
  plans: [PlanSchema],
  chatHistory: [ChatSchema],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Project", ProjectSchema);
