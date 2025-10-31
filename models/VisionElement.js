// models/VisionElement.js
import mongoose from "mongoose";

const VisionElementSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  planId: { type: String, required: true }, // ID du plan ou fichier analysé
  nom: { type: String, required: true },
  quantite: { type: Number, default: 0 },
  commentaire: { type: String, default: "" },
  x: { type: Number, default: 0 }, // position x sur l'image
  y: { type: Number, default: 0 }, // position y sur l'image
  width: { type: Number, default: 100 }, // largeur
  height: { type: Number, default: 50 }, // hauteur
  page: { type: Number, default: 1 }, // si plan multi-page
}, { timestamps: true });

export default mongoose.model("VisionElement", VisionElementSchema);
