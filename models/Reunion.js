import mongoose from "mongoose";

const reunionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  code: { type: String, required: true, unique: true }, // Ex: "reunion-45D3A1"
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
});

const Reunion = mongoose.model("Reunion", reunionSchema);
export default Reunion;




