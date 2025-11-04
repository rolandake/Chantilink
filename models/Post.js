// backend/models/Post.js - VERSION AVEC CLOUDINARY URLs
import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  content: { type: String, required: true },
  user: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String },
    fullName: { type: String },
    profilePhoto: { type: String },
    isVerified: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },
  },
  createdAt: { type: Date, default: Date.now },
});

const postSchema = new mongoose.Schema({
  user: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String },
    fullName: { type: String },
    profilePhoto: { type: String },
    isVerified: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },
  },
  content: { type: String },
  
  // ✅ MODIFICATION CRITIQUE: media stocke maintenant les URLs complètes
  media: [{ type: String }], // URLs Cloudinary complètes (secure_url)
  
  // ✅ NOUVEAU: Stocke les public_ids pour la suppression
  mediaPublicIds: [{ type: String }], // public_ids Cloudinary (ex: "posts/123-image.jpg")
  
  mediaType: { type: String, enum: ["image", "video", null] },
  location: { type: String },
  privacy: { type: String, default: "Public" },

  // --- Interactions ---
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  views: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [commentSchema],
  shares: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  // --- Compteurs optimisés ---
  likesCount: { type: Number, default: 0 },
  commentsCount: { type: Number, default: 0 },
  viewsCount: { type: Number, default: 0 },
  sharesCount: { type: Number, default: 0 },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ✅ Middleware pour synchroniser les compteurs
postSchema.pre("save", function (next) {
  this.likesCount = this.likes?.length || 0;
  this.commentsCount = this.comments?.length || 0;
  this.viewsCount = this.views?.length || 0;
  this.sharesCount = this.shares?.length || 0;
  this.updatedAt = new Date();
  next();
});

// ✅ Index pour optimiser les requêtes
postSchema.index({ "user._id": 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });

export default mongoose.model("Post", postSchema);