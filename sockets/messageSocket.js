// backend/sockets/messageSocket.js - VERSION FINALE CORRIGÉE
import Message from "../models/Message.js";
import User from "../models/User.js";
import mongoose from "mongoose";

export function registerMessageSocket(io, logger) {
  // Namespace dédié aux messages
  const messageNamespace = io.of("/messages");

  // Map pour suivre les utilisateurs en ligne
  const onlineUsers = new Map(); // userId -> socketId

  messageNamespace.on("connection", (socket) => {
    // ✅ L'authentification a déjà été faite par le middleware global
    // socket.data.user existe déjà grâce à io.use() dans server.js
    
    if (!socket.data?.user?.id) {
      logger.error("❌ [Messages] Connexion sans authentification - REFUSÉE");
      socket.emit("error", { message: "Authentification requise" });
      socket.disconnect();
      return;
    }

    const userId = socket.data.user.id;
    const username = socket.data.user.username || socket.data.user.fullName || socket.data.user.email;

    logger.info(`💬 [Messages] ${username} connecté (${socket.id})`);
    logger.debug(`💬 [Messages] UserID: ${userId}`);

    // Ajouter à la liste des utilisateurs en ligne
    onlineUsers.set(userId, socket.id);
    socket.join(userId); // Rejoindre sa propre room
    
    logger.debug(`💬 [Messages] ${username} a rejoint la room: ${userId}`);

    // Notifier tous les amis que cet utilisateur est en ligne
    socket.broadcast.emit("userOnline", { userId, username });

    // Envoyer la liste des utilisateurs en ligne au nouveau connecté
    const onlineUsersList = Array.from(onlineUsers.keys());
    socket.emit("onlineUsers", onlineUsersList);
    logger.debug(`💬 [Messages] Envoi liste en ligne: ${onlineUsersList.length} utilisateurs`);

    // ========================================
    // 📨 ENVOI DE MESSAGE
    // ========================================
    socket.on("sendMessage", async (data) => {
      try {
        logger.info(`📨 [sendMessage] Reçu de ${userId}`);
        logger.debug(`📨 [sendMessage] Data:`, JSON.stringify(data, null, 2));
        
        const { recipientId, content, file, audio, storyId } = data;

        if (!recipientId) {
          logger.warn(`📨 [sendMessage] Destinataire manquant`);
          return socket.emit("messageError", { error: "Destinataire requis" });
        }

        // Valider recipientId
        if (!mongoose.Types.ObjectId.isValid(recipientId)) {
          logger.warn(`📨 [sendMessage] recipientId invalide: ${recipientId}`);
          return socket.emit("messageError", { error: "ID destinataire invalide" });
        }

        logger.debug(`📨 [sendMessage] Création du message en base...`);

        // Créer le message en base de données
        const message = new Message({
          sender: userId,
          recipient: recipientId,
          content: content || "",
          file: file || null,
          audio: audio || null,
          storyId: storyId || null,
          read: false,
          timestamp: new Date(),
        });

        await message.save();
        logger.debug(`📨 [sendMessage] Message sauvegardé: ${message._id}`);

        // Peupler les infos du sender pour l'envoi
        await message.populate("sender", "fullName email profilePhoto");

        const messageData = {
          _id: message._id,
          sender: {
            _id: message.sender._id,
            fullName: message.sender.fullName,
            email: message.sender.email,
            profilePhoto: message.sender.profilePhoto,
          },
          recipient: message.recipient,
          content: message.content,
          file: message.file,
          audio: message.audio,
          storyId: message.storyId,
          read: message.read,
          timestamp: message.timestamp,
          createdAt: message.createdAt,
        };

        logger.info(`📨 [sendMessage] Message envoyé: ${userId} → ${recipientId}`);
        logger.debug(`📨 [sendMessage] Message data:`, JSON.stringify(messageData, null, 2));

        // Envoyer au destinataire (s'il est en ligne)
        const recipientSocketId = onlineUsers.get(recipientId);
        logger.debug(`📨 [sendMessage] Socket destinataire: ${recipientSocketId || 'OFFLINE'}`);
        logger.debug(`📨 [sendMessage] Envoi vers room: ${recipientId}`);
        
        messageNamespace.to(recipientId).emit("receiveMessage", messageData);

        // Confirmer au sender
        logger.debug(`📨 [sendMessage] Confirmation au sender: ${userId}`);
        socket.emit("messageSent", messageData);

        // Mettre à jour le nombre de messages non lus pour le destinataire
        const unreadCount = await Message.countDocuments({
          recipient: recipientId,
          read: false,
        });
        
        if (recipientSocketId) {
          messageNamespace.to(recipientId).emit("unreadCountUpdate", {
            senderId: userId,
            count: unreadCount,
          });
          logger.debug(`📨 [sendMessage] Compteur non lus envoyé: ${unreadCount}`);
        }
      } catch (error) {
        logger.error(`❌ [sendMessage] Erreur: ${error.message}`);
        logger.error(error.stack);
        socket.emit("messageError", { error: "Erreur lors de l'envoi du message" });
      }
    });

    // ========================================
    // ✅ MARQUER COMME LU
    // ========================================
    socket.on("markAsRead", async ({ senderId }) => {
      try {
        logger.debug(`✅ [markAsRead] ${userId} marque messages de ${senderId} comme lus`);
        
        await Message.updateMany(
          { sender: senderId, recipient: userId, read: false },
          { $set: { read: true } }
        );

        logger.info(`✅ [markAsRead] Messages marqués lus: ${senderId} → ${userId}`);

        // Notifier l'expéditeur que ses messages ont été lus
        messageNamespace.to(senderId).emit("messagesRead", { readBy: userId });

        socket.emit("markedAsRead", { senderId });
      } catch (error) {
        logger.error(`❌ [markAsRead] Erreur: ${error.message}`);
      }
    });

    // ========================================
    // 📝 EN TRAIN D'ÉCRIRE (TYPING INDICATOR)
    // ========================================
    socket.on("typing", ({ recipientId }) => {
      logger.debug(`📝 [typing] ${username} écrit à ${recipientId}`);
      messageNamespace.to(recipientId).emit("userTyping", {
        userId,
        username,
        fullName: socket.data.user.fullName,
      });
    });

    socket.on("stopTyping", ({ recipientId }) => {
      logger.debug(`📝 [stopTyping] ${username} a arrêté d'écrire à ${recipientId}`);
      messageNamespace.to(recipientId).emit("userStoppedTyping", {
        userId,
      });
    });

    // ========================================
    // 🗑️ SUPPRIMER MESSAGE
    // ========================================
    socket.on("deleteMessage", async ({ messageId, forEveryone }) => {
      try {
        logger.info(`🗑️ [deleteMessage] ${messageId} par ${userId} (forEveryone: ${forEveryone})`);
        
        const message = await Message.findById(messageId);

        if (!message) {
          return socket.emit("messageError", { error: "Message introuvable" });
        }

        // Vérifier que l'utilisateur est bien l'expéditeur
        if (message.sender.toString() !== userId) {
          return socket.emit("messageError", {
            error: "Vous ne pouvez supprimer que vos propres messages",
          });
        }

        if (forEveryone) {
          // Supprimer pour tout le monde
          await Message.findByIdAndDelete(messageId);
          
          messageNamespace.to(message.recipient.toString()).emit("messageDeleted", {
            messageId,
            forEveryone: true,
          });
          
          socket.emit("messageDeleted", { messageId, forEveryone: true });
        } else {
          // Marquer comme supprimé uniquement pour le sender
          message.deletedFor = message.deletedFor || [];
          if (!message.deletedFor.includes(userId)) {
            message.deletedFor.push(userId);
          }
          await message.save();
          
          socket.emit("messageDeleted", { messageId, forEveryone: false });
        }

        logger.info(`🗑️ [deleteMessage] Message supprimé: ${messageId}`);
      } catch (error) {
        logger.error(`❌ [deleteMessage] Erreur: ${error.message}`);
        socket.emit("messageError", { error: "Erreur lors de la suppression" });
      }
    });

    // ========================================
    // ➡️ TRANSFÉRER MESSAGE
    // ========================================
    socket.on("forwardMessage", async ({ messageId, recipientIds }) => {
      try {
        logger.info(`➡️ [forwardMessage] ${messageId} vers ${recipientIds.length} destinataires`);
        
        const originalMessage = await Message.findById(messageId);

        if (!originalMessage) {
          return socket.emit("messageError", { error: "Message introuvable" });
        }

        const forwardedMessages = [];

        for (const recipientId of recipientIds) {
          const newMessage = new Message({
            sender: userId,
            recipient: recipientId,
            content: originalMessage.content,
            file: originalMessage.file,
            audio: originalMessage.audio,
            forwarded: true,
            originalSender: originalMessage.sender,
            read: false,
            timestamp: new Date(),
          });

          await newMessage.save();
          await newMessage.populate("sender", "fullName email profilePhoto");

          forwardedMessages.push(newMessage);

          // Envoyer au destinataire
          messageNamespace.to(recipientId).emit("receiveMessage", newMessage);
        }

        socket.emit("messagesForwarded", { count: forwardedMessages.length });
        logger.info(`➡️ [forwardMessage] Message transféré à ${recipientIds.length} destinataires`);
      } catch (error) {
        logger.error(`❌ [forwardMessage] Erreur: ${error.message}`);
        socket.emit("messageError", { error: "Erreur lors du transfert" });
      }
    });

    // ========================================
    // 📥 CHARGER CONVERSATION
    // ========================================
    socket.on("loadConversation", async ({ userId: otherUserId, page = 1, limit = 50 }) => {
      try {
        logger.info(`📥 [loadConversation] ${userId} ↔ ${otherUserId} (page ${page})`);
        
        const messages = await Message.find({
          $or: [
            { sender: userId, recipient: otherUserId },
            { sender: otherUserId, recipient: userId },
          ],
          deletedFor: { $ne: userId }, // Exclure les messages supprimés pour cet utilisateur
        })
          .populate("sender", "fullName email profilePhoto")
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit);

        socket.emit("conversationLoaded", {
          messages: messages.reverse(), // Inverser pour avoir du plus ancien au plus récent
          hasMore: messages.length === limit,
        });

        logger.info(`📥 [loadConversation] Conversation chargée: ${messages.length} messages`);
      } catch (error) {
        logger.error(`❌ [loadConversation] Erreur: ${error.message}`);
        socket.emit("messageError", { error: "Erreur lors du chargement" });
      }
    });

    // ========================================
    // 📊 NOMBRE DE MESSAGES NON LUS
    // ========================================
    socket.on("getUnreadCounts", async () => {
      try {
        logger.debug(`📊 [getUnreadCounts] Demande de ${userId}`);
        
        const counts = await Message.aggregate([
          {
            $match: {
              recipient: new mongoose.Types.ObjectId(userId),
              read: false,
            },
          },
          {
            $group: {
              _id: "$sender",
              count: { $sum: 1 },
            },
          },
        ]);

        socket.emit("unreadCounts", counts);
        logger.debug(`📊 [getUnreadCounts] Envoyé: ${counts.length} conversations non lues`);
      } catch (error) {
        logger.error(`❌ [getUnreadCounts] Erreur: ${error.message}`);
      }
    });

    // ========================================
    // 🔌 DÉCONNEXION
    // ========================================
    socket.on("disconnect", () => {
      logger.info(`💬 [Messages] ${username} déconnecté (${socket.id})`);
      
      onlineUsers.delete(userId);
      
      // Notifier tous les amis que cet utilisateur est hors ligne
      socket.broadcast.emit("userOffline", { userId, username });
    });
  });

  logger.info("✅ Socket Message namespace initialisé sur /messages");
}