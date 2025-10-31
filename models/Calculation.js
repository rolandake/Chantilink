// backend/models/Calculation.js
import mongoose from "mongoose";

const calculationSchema = new mongoose.Schema(
  {
    // Propriétaire du calcul
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Type de projet
    typeProjet: {
      type: String,
      required: true,
      enum: ["tp", "vrd", "batiment", "hydraulique", "assainissement", "autre"],
      default: "tp",
    },

    // Devise utilisée
    devise: {
      type: String,
      default: "XOF",
      enum: ["XOF", "EUR", "USD", "MAD", "GNF"],
    },

    // Données d'entrée (inputs)
    inputs: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },

    // Résultats des calculs
    results: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },

    // Notes optionnelles
    notes: {
      type: String,
      default: "",
      maxlength: 5000,
    },

    // Métadonnées supplémentaires
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true, // Ajoute automatiquement createdAt et updatedAt
    collection: "calculations",
  }
);

// ========================================
// INDEX POUR OPTIMISER LES REQUÊTES
// ========================================
calculationSchema.index({ owner: 1, createdAt: -1 });
calculationSchema.index({ owner: 1, typeProjet: 1 });
calculationSchema.index({ owner: 1, "inputs.typeCalcul": 1 });

// ========================================
// MÉTHODES D'INSTANCE
// ========================================
calculationSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// ========================================
// MÉTHODES STATIQUES
// ========================================
calculationSchema.statics.findByOwner = function (ownerId, options = {}) {
  const query = this.find({ owner: ownerId });
  
  if (options.typeProjet) {
    query.where("typeProjet").equals(options.typeProjet);
  }
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  return query.sort({ createdAt: -1 });
};

// ========================================
// MIDDLEWARE PRE-SAVE (VALIDATION)
// ========================================
calculationSchema.pre("save", function (next) {
  // S'assurer que inputs n'est pas vide
  if (!this.inputs || Object.keys(this.inputs).length === 0) {
    return next(new Error("Les données d'entrée (inputs) ne peuvent pas être vides"));
  }
  
  // S'assurer que results n'est pas vide
  if (!this.results || Object.keys(this.results).length === 0) {
    return next(new Error("Les résultats ne peuvent pas être vides"));
  }
  
  next();
});

// ========================================
// EXPORT DU MODÈLE
// ========================================
const Calculation = mongoose.model("Calculation", calculationSchema);

export default Calculation;