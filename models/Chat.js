import mongoose from "mongoose";

// Schema pour chaque message
const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "ai"], required: true },
    content: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } } // chaque message a un createdAt
);

// Schema pour le chat d'un utilisateur
const chatSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true } // createdAt et updatedAt pour le chat
);

// Méthode statique pour récupérer ou créer un chat
chatSchema.statics.findOrCreate = async function (userId) {
  let chat = await this.findOne({ userId });
  if (!chat) {
    chat = new this({ userId });
    await chat.save();
  }
  return chat;
};

const LocalChat = mongoose.model("LocalChat", chatSchema);
export default LocalChat;
