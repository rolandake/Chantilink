// backend/models/User.js - VERSION CORRIGÉE - CHANTILINK
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// ========================
// 🔔 SCHÉMA DE NOTIFICATION
// ========================
const notificationSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ["like", "comment", "follow", "share", "mention", "friend_request", "admin", "system", "user"],
    required: true 
  },
  title: { type: String, maxlength: 100 },
  message: { type: String, maxlength: 500 },
  text: { type: String, maxlength: 500 },
  sender: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    fullName: { type: String },
    profilePhoto: { type: String },
    isVerified: { type: Boolean, default: false },
  },
  post: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    content: { type: String },
    media: { type: String },
  },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema(
  {
    // ========================
    // 🔹 Nom affiché et email
    // ========================
    fullName: {
      type: String,
      required: [true, "Le nom complet est requis"],
      trim: true,
      minlength: [3, "Le nom doit contenir au moins 3 caractères"],
      maxlength: [30, "Le nom ne peut pas dépasser 30 caractères"],
    },
    email: {
      type: String,
      required: [true, "L'email est requis"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Email invalide"],
    },
    password: {
      type: String,
      required: [true, "Le mot de passe est requis"],
      minlength: [6, "Le mot de passe doit contenir au moins 6 caractères"],
      select: false,
    },

    // ========================
    // 📞 NUMÉRO DE TÉLÉPHONE
    // ========================
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      match: [/^\+?[0-9]{10,15}$/, "Numéro de téléphone invalide"],
    },

    phoneVerified: {
      type: Boolean,
      default: false,
    },

    phoneVerificationCode: {
      type: String,
      select: false,
    },

    phoneVerificationExpires: {
      type: Date,
      select: false,
    },

    hasSeenPhoneModal: {
      type: Boolean,
      default: false,
    },

    // ========================
    // 📇 CONTACTS SYNCHRONISÉS
    // ========================
    contacts: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      phone: {
        type: String,
        required: true,
        trim: true
      },
      normalizedPhone: {
        type: String,
        required: true
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
      isOnChantilink: {
        type: Boolean,
        default: false
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    lastContactSync: {
      type: Date,
      default: null
    },

    // ========================
    // 💬 PARAMÈTRES DE CHAT
    // ========================
    chatSettings: {
      allowContactsToMessage: { type: Boolean, default: true },
      allowFriendsToMessage: { type: Boolean, default: true },
      allowStoryReplyFromAnyone: { type: Boolean, default: false },
      readReceipts: { type: Boolean, default: true },
      showOnlineStatus: { type: Boolean, default: true },
      allowVoiceMessages: { type: Boolean, default: true }
    },

    // ========================
    // 🧍 Profil utilisateur
    // ========================
    bio: { type: String, maxlength: 300, trim: true, default: "" },
    profilePhoto: { type: String, default: "/default-avatar.png" },
    coverPhoto: { type: String, default: null },
    location: { type: String, trim: true },
    website: { type: String, trim: true },

    // ========================
    // 🔁 Relations sociales
    // ========================
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
    blocked: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },

    // ========================
    // 🔔 NOTIFICATIONS
    // ========================
    notifications: [notificationSchema],

    // ========================
    // ⚙️ Statut & rôle
    // ========================
    role: {
      type: String,
      enum: ["user", "admin", "moderator"],
      default: "user",
    },
    isVerified: { type: Boolean, default: false },
    isBanned: { type: Boolean, default: false },
    isPremium: { type: Boolean, default: false },

    // ========================
    // 🔒 Sécurité
    // ========================
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    lastLogin: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ========================
// 🔐 Méthodes de sécurité
// ========================

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.incLoginAttempts = function () {
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2h
  
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ 
      $set: { loginAttempts: 1 }, 
      $unset: { lockUntil: 1 } 
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0, lastLogin: Date.now() },
    $unset: { lockUntil: 1 },
  });
};

userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    _id: this._id,
    fullName: this.fullName,
    email: this.email,
    phone: this.phone,
    hasSeenPhoneModal: this.hasSeenPhoneModal,
    bio: this.bio,
    profilePhoto: this.profilePhoto,
    coverPhoto: this.coverPhoto,
    location: this.location,
    website: this.website,
    followersCount: this.followers?.length || 0,
    followingCount: this.following?.length || 0,
    isVerified: this.isVerified,
    isPremium: this.isPremium,
    role: this.role,
    createdAt: this.createdAt,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    notifications: this.notifications || [],
  };
};

// ========================
// 📇 MÉTHODES CONTACTS
// ========================

userSchema.methods.syncContacts = async function (contactsList) {
  const syncedContacts = [];
  const thisUser = this;
  
  for (const contact of contactsList) {
    const normalizedPhone = contact.phone
      .replace(/[\s\-\(\)\.]/g, '')
      .replace(/^00/, '+')
      .replace(/^0/, '+225');
    
    const foundUser = await mongoose.model('User').findOne({ 
      phone: normalizedPhone 
    }).select('_id fullName profilePhoto phone');
    
    syncedContacts.push({
      name: contact.name,
      phone: contact.phone,
      normalizedPhone,
      userId: foundUser?._id || null,
      isOnChantilink: !!foundUser,
      addedAt: new Date()
    });

    if (foundUser) {
      await mongoose.model('User').updateOne(
        { _id: foundUser._id },
        { 
          $addToSet: { 
            contacts: {
              name: thisUser.fullName,
              phone: thisUser.phone,
              normalizedPhone: thisUser.phone,
              userId: thisUser._id,
              isOnChantilink: true,
              addedAt: new Date()
            }
          }
        }
      );
    }
  }
  
  this.contacts = syncedContacts;
  this.lastContactSync = new Date();
  
  return syncedContacts;
};

userSchema.methods.getContactsOnChantilink = function () {
  return this.contacts
    .filter(c => c.isOnChantilink && c.userId)
    .map(c => c.userId);
};

userSchema.methods.isContact = function (userId) {
  return this.contacts.some(
    c => c.userId && c.userId.toString() === userId.toString()
  );
};

// ========================
// 💬 MÉTHODES CHAT
// ========================

userSchema.methods.canChatWith = async function (otherUserId) {
  const otherUser = await mongoose.model('User').findById(otherUserId);
  
  if (!otherUser) {
    return { allowed: false, reason: "user_not_found" };
  }
  
  if (otherUser.blocked.includes(this._id)) {
    return { allowed: false, reason: "blocked_by_user" };
  }
  
  if (this.blocked.includes(otherUserId)) {
    return { allowed: false, reason: "you_blocked_user" };
  }
  
  if (this.isContact(otherUserId) && otherUser.chatSettings?.allowContactsToMessage) {
    return { allowed: true, reason: "contact", type: "contact" };
  }
  
  if (this.friends.includes(otherUserId) && otherUser.chatSettings?.allowFriendsToMessage) {
    return { allowed: true, reason: "friend", type: "friend" };
  }
  
  if (otherUser.chatSettings?.allowStoryReplyFromAnyone) {
    return { allowed: true, reason: "open_settings", type: "open" };
  }
  
  return { allowed: false, reason: "not_connected" };
};

// ========================
// 📦 Index pour performance
// ========================
userSchema.index({ fullName: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ "contacts.normalizedPhone": 1 });
userSchema.index({ "contacts.userId": 1 });

const User = mongoose.model("User", userSchema);
export default User;