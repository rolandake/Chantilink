// backend/models/Story.js - Version Optimisée
import mongoose from 'mongoose';

const { Schema, model } = mongoose;
const { ObjectId } = Schema.Types;

const storySchema = new Schema({
  owner: { 
    type: ObjectId, 
    ref: "User", 
    required: true, 
    index: true 
  },
  
  slides: [{
    media: {
      type: String,
      required: true,
      trim: true
    },
    type: { 
      type: String,
      enum: ["image", "video"], 
      default: "image",
      required: true
    },
    text: {
      type: String,
      maxlength: 200
    },
    filter: {
      type: String,
      default: "Original"
    },
    duration: { 
      type: Number, 
      default: 5000,
      min: 3000,
      max: 15000
    },
    views: [{
      type: ObjectId,
      ref: "User"
    }],
    reactions: [{
      user: {
        type: ObjectId,
        ref: "User"
      },
      emoji: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    mentions: [{
      type: ObjectId,
      ref: "User"
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  hashtags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  
  visibility: {
    type: String,
    enum: ["public", "followers", "private"],
    default: "public",
    index: true
  },
  
  allowedUsers: [{
    type: ObjectId,
    ref: "User"
  }],
  
  archived: { 
    type: Boolean, 
    default: false,
    index: true
  },
  
  archivedAt: Date,
  
  createdAt: { 
    type: Date, 
    default: Date.now, 
    index: true 
  },
  
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    index: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index composé pour optimiser les requêtes
storySchema.index({ owner: 1, expiresAt: -1 });
storySchema.index({ visibility: 1, expiresAt: -1 });
storySchema.index({ archived: 1, owner: 1 });

// TTL Index - supprime automatiquement les documents expirés
storySchema.index({ expiresAt: 1 }, { 
  expireAfterSeconds: 0,
  partialFilterExpression: { archived: false }
});

// Virtual pour le temps restant
storySchema.virtual('timeRemaining').get(function() {
  if (!this.expiresAt) return 0;
  const now = new Date();
  const diff = this.expiresAt - now;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60))); // heures
});

// Virtual pour le nombre total de vues
storySchema.virtual('totalViews').get(function() {
  return this.slides.reduce((sum, slide) => sum + (slide.views?.length || 0), 0);
});

// Virtual pour le nombre de spectateurs uniques
storySchema.virtual('uniqueViewers').get(function() {
  const viewers = new Set();
  this.slides.forEach(slide => {
    slide.views?.forEach(view => {
      viewers.add(view.toString());
    });
  });
  return viewers.size;
});

// Méthode pour vérifier si une story est expirée
storySchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Méthode pour vérifier si un utilisateur a vu toutes les slides
storySchema.methods.hasUserViewedAll = function(userId) {
  return this.slides.every(slide => 
    slide.views.some(view => view.toString() === userId.toString())
  );
};

// Méthode pour obtenir les analytics
storySchema.methods.getAnalytics = function() {
  const uniqueViewers = new Set();
  const slidesAnalytics = this.slides.map((slide, index) => {
    slide.views?.forEach(view => uniqueViewers.add(view.toString()));
    
    return {
      index,
      type: slide.type,
      views: slide.views?.length || 0,
      reactions: slide.reactions?.length || 0,
      text: slide.text || null
    };
  });

  return {
    totalSlides: this.slides.length,
    totalViews: this.totalViews,
    uniqueViewers: uniqueViewers.size,
    createdAt: this.createdAt,
    expiresAt: this.expiresAt,
    hoursRemaining: this.timeRemaining,
    slidesAnalytics
  };
};

// Hook pre-save pour validation
storySchema.pre('save', function(next) {
  // S'assurer qu'il y a au moins une slide
  if (!this.slides || this.slides.length === 0) {
    next(new Error('Une story doit contenir au moins une slide'));
  }
  
  // Nettoyer les hashtags
  if (this.hashtags) {
    this.hashtags = [...new Set(this.hashtags.map(h => h.toLowerCase().trim()))];
  }
  
  next();
});

const Story = model('Story', storySchema);

export default Story;