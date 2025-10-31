import mongoose from "mongoose";

const offerSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "", trim: true },
  price: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, default: true },

  // L'utilisateur qui a posté l’offre
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
});

offerSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Offer = mongoose.model("Offer", offerSchema);
export default Offer;
