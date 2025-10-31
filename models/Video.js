// models/Video.js
import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    user: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const videoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },

    title: { type: String, default: "" },
    description: { type: String, default: "" },

    type: { type: String, enum: ["video", "reel"], default: "video" },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // 🎥 Montage / édition
    startTime: { type: Number, default: 0 }, // en secondes
    endTime: { type: Number }, // en secondes
    filter: { type: String, default: null }, // filtre appliqué (blur, sepia, etc.)
    textOverlay: { type: String, default: "" },
    textColor: { type: String, default: "#ffffff" },
    textPos: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },

    // 💙 Interactions
    likes: { type: Number, default: 0 },
    comments: [commentSchema],
    views: { type: Number, default: 0 }, // compteur de vues
  },
  { timestamps: true }
);

const Video = mongoose.model("Video", videoSchema);
export default Video;
