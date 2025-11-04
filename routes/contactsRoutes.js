// backend/routes/contactsRoutes.js - VERSION CORRIGÉE
import express from "express";
import { verifyToken } from "../middleware/auth.js";
import User from "../models/User.js";
import pino from "pino";

const router = express.Router();

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: { colorize: true, translateTime: "HH:MM:ss" },
  },
});

// ========================================
// 📞 SYNCHRONISER LES CONTACTS - CORRIGÉ
// ========================================
router.post("/sync", verifyToken, async (req, res) => {
  try {
    const { contacts } = req.body;
    const userId = req.user.id;

    moduleLogger.info(`📞 [Contacts] Synchro pour user ${userId}`);
    moduleLogger.debug(`📞 [Contacts] ${contacts?.length || 0} contacts reçus`);

    // VALIDATION AMÉLIORÉE
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ 
        message: "Liste de contacts vide ou invalide",
        received: contacts
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    // SYNCHRONISATION AVEC GESTION D'ERREURS
    const syncedContacts = [];
    const errors = [];

    for (const contact of contacts) {
      try {
        // Validation du contact
        if (!contact.name || !contact.phone) {
          errors.push(`Contact invalide: ${JSON.stringify(contact)}`);
          continue;
        }

        // Normalisation du numéro
        const normalizedPhone = contact.phone
          .replace(/[\s\-\(\)\.]/g, '')
          .replace(/^00/, '+')
          .replace(/^0/, '+225');

        // Recherche sur Chantilink
        const foundUser = await User.findOne({ 
          phone: normalizedPhone 
        }).select('_id fullName profilePhoto phone');

        syncedContacts.push({
          name: contact.name.trim(),
          phone: contact.phone,
          normalizedPhone,
          userId: foundUser?._id || null,
          isOnChantilink: !!foundUser,
          addedAt: new Date()
        });

        moduleLogger.debug(`✓ Contact traité: ${contact.name} -> ${foundUser ? 'Sur Chantilink' : 'Non trouvé'}`);
      } catch (err) {
        errors.push(`Erreur contact ${contact.name}: ${err.message}`);
        moduleLogger.error(`❌ Erreur traitement contact:`, err);
      }
    }

    // MISE À JOUR DU USER
    user.contacts = syncedContacts;
    user.lastContactSync = new Date();
    await user.save();

    // STATISTIQUES
    const onChantilink = syncedContacts.filter(c => c.isOnChantilink);
    const notOnChantilink = syncedContacts.filter(c => !c.isOnChantilink);

    moduleLogger.info(`✅ [Contacts] Synchro OK: ${onChantilink.length}/${syncedContacts.length} sur Chantilink`);
    
    if (errors.length > 0) {
      moduleLogger.warn(`⚠️ [Contacts] ${errors.length} erreurs pendant la synchro`);
    }

    // RÉPONSE AVEC DONNÉES COMPLÈTES
    res.json({
      success: true,
      message: "Contacts synchronisés avec succès",
      stats: {
        total: syncedContacts.length,
        onChantilink: onChantilink.length,
        notOnChantilink: notOnChantilink.length,
        errors: errors.length
      },
      contacts: syncedContacts.map(c => ({
        name: c.name,
        phone: c.phone,
        isOnChantilink: c.isOnChantilink,
        userId: c.userId,
        user: c.userId ? {
          id: c.userId,
          fullName: c.userId.fullName || c.name,
          profilePhoto: c.userId.profilePhoto
        } : null
      })),
      warnings: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    moduleLogger.error(`❌ [Contacts] Erreur synchro:`, err);
    res.status(500).json({ 
      message: "Erreur lors de la synchronisation des contacts",
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});


// ========================================
// ➕ AJOUTER UN CONTACT MANUELLEMENT
// ========================================
router.post("/add", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: "Nom et numéro requis" });
    }

    const normalizedPhone = phone
      .replace(/[\s\-\(\)\.]/g, '')
      .replace(/^00/, '+')
      .replace(/^0/, '+225');

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

    // Vérifier doublon
    if (user.contacts.some(c => c.normalizedPhone === normalizedPhone)) {
      return res.status(400).json({ message: "Contact déjà existant" });
    }

    // Vérifier si ce contact existe sur Chantilink
    const foundUser = await User.findOne({ phone: normalizedPhone })
      .select('_id fullName profilePhoto phone');

    const newContact = {
      name: name.trim(),
      phone,
      normalizedPhone,
      userId: foundUser?._id || null,
      isOnChantilink: !!foundUser,
      addedAt: new Date()
    };

    user.contacts.push(newContact);
    await user.save();

    res.json({
      success: true,
      message: "Contact ajouté avec succès",
      contact: newContact
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de l'ajout du contact", error: err.message });
  }
});


// ➕ Ajouter un utilisateur Chantilink par son ID
router.post("/add-by-userid", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ message: "ID du contact requis" });
    }

    if (targetUserId === userId) {
      return res.status(400).json({ message: "Impossible de s'ajouter soi-même" });
    }

    const user = await User.findById(userId);
    const targetUser = await User.findById(targetUserId);

    if (!user || !targetUser) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    // Vérifie si déjà dans les contacts
    const alreadyAdded = user.contacts.some(
      c => c.userId?.toString() === targetUserId
    );

    if (alreadyAdded) {
      return res.status(400).json({ message: "Cet utilisateur est déjà dans vos contacts" });
    }

    // Ajouter le contact
    user.contacts.push({
      name: targetUser.fullName,
      phone: targetUser.phone,
      normalizedPhone: targetUser.phone,
      userId: targetUser._id,
      isOnChantilink: true,
      addedAt: new Date(),
    });

    await user.save();

    res.json({
      success: true,
      message: "Utilisateur ajouté à vos contacts",
      contact: {
        id: targetUser._id,
        fullName: targetUser.fullName,
        profilePhoto: targetUser.profilePhoto,
        phone: targetUser.phone,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur lors de l'ajout du contact Chantilink" });
  }
});

// ========================================
// 💬 CONVERSATIONS POSSIBLES - CORRIGÉ
// ========================================
router.get("/conversations", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    moduleLogger.debug(`💬 [Contacts] Conversations possibles pour ${userId}`);

    const user = await User.findById(userId)
      .populate("friends", "fullName email profilePhoto phone isOnline lastSeen")
      .populate("contacts.userId", "fullName email profilePhoto phone isOnline lastSeen");

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    // 1. Contacts sur Chantilink
    const contactsOnChantilink = user.contacts
      .filter(c => c.isOnChantilink && c.userId)
      .map(c => {
        const userObj = c.userId.toObject ? c.userId.toObject() : c.userId;
        return {
          id: userObj._id || userObj.id,
          fullName: userObj.fullName || c.name,
          email: userObj.email,
          profilePhoto: userObj.profilePhoto,
          phone: userObj.phone || c.phone,
          isOnline: userObj.isOnline || false,
          lastSeen: userObj.lastSeen,
          source: "contact",
          contactName: c.name
        };
      });

    // 2. Amis
    const friends = user.friends.map(f => {
      const friendObj = f.toObject ? f.toObject() : f;
      return {
        id: friendObj._id || friendObj.id,
        fullName: friendObj.fullName,
        email: friendObj.email,
        profilePhoto: friendObj.profilePhoto,
        phone: friendObj.phone,
        isOnline: friendObj.isOnline || false,
        lastSeen: friendObj.lastSeen,
        source: "friend"
      };
    });

    // 3. Fusionner et dédupliquer
    const allConnections = [...contactsOnChantilink, ...friends];
    const uniqueConnections = Array.from(
      new Map(allConnections.map(c => [c.id.toString(), c])).values()
    );

    // Trier par statut en ligne puis par nom
    uniqueConnections.sort((a, b) => {
      if (a.isOnline !== b.isOnline) {
        return a.isOnline ? -1 : 1;
      }
      return (a.fullName || '').localeCompare(b.fullName || '');
    });

    moduleLogger.info(`✅ [Contacts] ${uniqueConnections.length} conversations possibles (${contactsOnChantilink.length} contacts, ${friends.length} amis)`);

    res.json({
      total: uniqueConnections.length,
      contacts: contactsOnChantilink.length,
      friends: friends.length,
      connections: uniqueConnections
    });
  } catch (err) {
    moduleLogger.error(`❌ [Contacts] Erreur conversations:`, err);
    res.status(500).json({ 
      message: "Erreur lors de la récupération",
      error: err.message
    });
  }
});

// ========================================
// 📋 OBTENIR LISTE DES CONTACTS
// ========================================
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { onlyChantilink } = req.query;

    moduleLogger.debug(`📋 [Contacts] Liste pour user ${userId}`);

    const user = await User.findById(userId)
      .populate("contacts.userId", "fullName email profilePhoto phone isOnline lastSeen");

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    let contacts = user.contacts;

    // Filtrer uniquement ceux sur Chantilink si demandé
    if (onlyChantilink === "true") {
      contacts = contacts.filter(c => c.isOnChantilink && c.userId);
    }

    res.json({
      contacts: contacts.map(c => ({
        name: c.name,
        phone: c.phone,
        isOnChantilink: c.isOnChantilink,
        addedAt: c.addedAt,
        user: c.userId ? {
          id: c.userId._id,
          fullName: c.userId.fullName,
          email: c.userId.email,
          profilePhoto: c.userId.profilePhoto,
          phone: c.userId.phone,
          isOnline: c.userId.isOnline,
          lastSeen: c.userId.lastSeen
        } : null
      })),
      lastSync: user.lastContactSync
    });
  } catch (err) {
    moduleLogger.error(`❌ [Contacts] Erreur liste:`, err);
    res.status(500).json({ 
      message: "Erreur lors de la récupération des contacts" 
    });
  }
});

// ========================================
// 📊 STATISTIQUES CONTACTS
// ========================================
router.get("/stats", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    const total = user.contacts.length;
    const onChantilink = user.contacts.filter(c => c.isOnChantilink).length;
    const notOnChantilink = total - onChantilink;

    res.json({
      total,
      onChantilink,
      notOnChantilink,
      lastSync: user.lastContactSync,
      syncedDaysAgo: user.lastContactSync 
        ? Math.floor((Date.now() - user.lastContactSync) / (1000 * 60 * 60 * 24))
        : null
    });
  } catch (err) {
    moduleLogger.error(`❌ [Contacts] Erreur stats:`, err);
    res.status(500).json({ message: "Erreur lors de la récupération des stats" });
  }
});

// ========================================
// ✅ VÉRIFIER SI PEUT CHATTER - CORRIGÉ
// ========================================
router.get("/can-chat/:userId", verifyToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId: targetUserId } = req.params;

    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    const result = await user.canChatWith(targetUserId);

    res.json(result);
  } catch (err) {
    moduleLogger.error(`❌ [Contacts] Erreur can-chat:`, err);
    res.status(500).json({ message: "Erreur lors de la vérification" });
  }
});

// ========================================
// 🔍 CHERCHER UN CONTACT PAR NUMÉRO
// ========================================
router.get("/search/:phone", verifyToken, async (req, res) => {
  try {
    const { phone } = req.params;
    
    moduleLogger.debug(`🔍 [Contacts] Recherche: ${phone}`);

    // Normaliser le numéro
    const normalizedPhone = phone
      .replace(/[\s\-\(\)\.]/g, '')
      .replace(/^00/, '+')
      .replace(/^0/, '+225');

    const user = await User.findOne({ phone: normalizedPhone })
      .select("fullName email profilePhoto phone isOnline");

    if (!user) {
      return res.json({ 
        found: false, 
        message: "Aucun utilisateur trouvé avec ce numéro" 
      });
    }

    res.json({
      found: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        profilePhoto: user.profilePhoto,
        phone: user.phone,
        isOnline: user.isOnline
      }
    });
  } catch (err) {
    moduleLogger.error(`❌ [Contacts] Erreur recherche:`, err);
    res.status(500).json({ message: "Erreur lors de la recherche" });
  }
});

// ========================================
// 🗑️ SUPPRIMER UN CONTACT
// ========================================
router.delete("/:contactPhone", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactPhone } = req.params;

    moduleLogger.info(`🗑️ [Contacts] Suppression: ${contactPhone} par ${userId}`);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    // Normaliser le numéro
    const normalizedPhone = contactPhone
      .replace(/[\s\-\(\)\.]/g, '')
      .replace(/^00/, '+')
      .replace(/^0/, '+225');

    const initialLength = user.contacts.length;
    user.contacts = user.contacts.filter(
      c => c.normalizedPhone !== normalizedPhone
    );

    if (user.contacts.length === initialLength) {
      return res.status(404).json({ message: "Contact introuvable" });
    }

    await user.save();

    moduleLogger.info(`✅ [Contacts] Contact supprimé`);

    res.json({
      success: true,
      message: "Contact supprimé avec succès"
    });
  } catch (err) {
    moduleLogger.error(`❌ [Contacts] Erreur suppression:`, err);
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
});

export default router;
