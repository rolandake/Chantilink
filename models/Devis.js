import mongoose from "mongoose";

const devisSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  quantites: {
    ciment: Number,
    sable: Number,
    gravier: Number,
    eau: Number,
  },
  prixUnitaires: {
    ciment: Number,
    sable: Number,
    gravier: Number,
    eau: Number,
  },
  coutsMateriaux: {
    ciment: Number,
    sable: Number,
    gravier: Number,
    eau: Number,
  },
  mainOeuvre: {
    ouvriers: Number,
    coutParOuvrier: Number,
    dureeHeures: Number,
  },
  totalMateriaux: Number,
  totalMainOeuvre: Number,
  totalGlobal: Number,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Devis", devisSchema);
