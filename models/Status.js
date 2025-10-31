import mongoose from "mongoose";

function arrayLimit(val) {
  return val.length <= 20; // ✅ jusqu’à 20 images
}

const statusSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    images: {
      type: [String],
      default: [],
      validate: [arrayLimit, "{PATH} dépasse la limite de 20 images"], // ✅ maj du message
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likes: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    comments: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Comment",
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Status", statusSchema);
