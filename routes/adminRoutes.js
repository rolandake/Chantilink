// ========================================
// routes/adminRoutes.js - Routes Admin
// ========================================
import express from 'express';
import User from '../models/User.js';
import Post from '../models/Post.js';

const router = express.Router();

// ========================================
// GET ALL USERS
// ========================================
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json({ 
      success: true, 
      users,
      total: users.length 
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ 
      error: 'Erreur serveur lors de la récupération des utilisateurs' 
    });
  }
});

// ========================================
// GET USER BY ID
// ========================================
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========================================
// UPDATE USER (EDIT)
// ========================================
router.patch('/users/:id/edit', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, fullName } = req.body;
    
    // ✅ Validation: seul l'email est requis
    if (!email) {
      return res.status(400).json({ 
        message: 'L\'email est requis' 
      });
    }

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    const existingUser = await User.findOne({ 
      email, 
      _id: { $ne: id } 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Cet email est déjà utilisé' 
      });
    }

    // ✅ Construire les mises à jour
    const updates = { email: email.trim() };
    if (fullName !== undefined && fullName !== null && fullName.trim() !== '') {
      updates.fullName = fullName.trim();
    }
    
    // ✅ Mettre à jour l'utilisateur
    const user = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }
    
    console.log(`✅ Utilisateur ${user._id} modifié:`, updates);
    
    res.json({ 
      success: true, 
      user,
      message: 'Utilisateur modifié avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    res.status(500).json({ 
      message: 'Erreur serveur',
      error: error.message 
    });
  }
});
// ========================================
// UPDATE USER (LEGACY - pour compatibilité)
// ========================================
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Ne pas permettre la modification du mot de passe via cette route
    delete updates.password;
    
    const user = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========================================
// DELETE USER
// ========================================
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByIdAndDelete(id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }
    
    // Supprimer également tous les posts de l'utilisateur
    await Post.deleteMany({ author: id });
    
    res.json({ 
      success: true, 
      message: 'Utilisateur et ses posts supprimés avec succès' 
    });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ========================================
// BAN/UNBAN USER
// ========================================
router.patch('/users/:id/ban', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    // Toggle ban status
    user.isBanned = !user.isBanned;
    await user.save();
    
    res.json({ 
      success: true, 
      user,
      message: user.isBanned ? 'Utilisateur banni avec succès' : 'Utilisateur débanni avec succès'
    });
  } catch (error) {
    console.error('Erreur lors du ban/unban:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ========================================
// CERTIFY USER (VERIFY)
// ========================================
router.patch('/users/:id/certify', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    // Toggle verification status
    user.isVerified = !user.isVerified;
    await user.save();
    
    res.json({ 
      success: true, 
      user,
      message: user.isVerified ? 'Utilisateur certifié avec succès' : 'Certification retirée'
    });
  } catch (error) {
    console.error('Erreur lors de la certification:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ========================================
// PREMIUM USER
// ========================================
router.patch('/users/:id/premium', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    // Toggle premium status
    user.isPremium = !user.isPremium;
    await user.save();
    
    res.json({ 
      success: true, 
      user,
      message: user.isPremium ? 'Utilisateur premium activé' : 'Statut premium retiré'
    });
  } catch (error) {
    console.error('Erreur lors de la modification premium:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ========================================
// PROMOTE USER TO ADMIN
// ========================================
router.patch('/users/:id/promote', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Utilisateur déjà administrateur' });
    }

    user.role = 'admin';
    await user.save();
    
    res.json({ 
      success: true, 
      user,
      message: 'Utilisateur promu administrateur avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la promotion:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ========================================
// DEMOTE ADMIN TO USER
// ========================================
router.patch('/users/:id/demote', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    if (user.role !== 'admin') {
      return res.status(400).json({ message: 'Utilisateur n\'est pas administrateur' });
    }

    user.role = 'user';
    await user.save();
    
    res.json({ 
      success: true, 
      user,
      message: 'Utilisateur rétrogradé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la rétrogradation:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ========================================
// VERIFY USER (LEGACY - pour compatibilité)
// ========================================
router.patch('/users/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;
    
    const user = await User.findByIdAndUpdate(
      id,
      { $set: { isVerified: isVerified === true } },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }
    
    res.json({ 
      success: true, 
      user,
      message: isVerified ? 'Utilisateur vérifié' : 'Vérification retirée'
    });
  } catch (error) {
    console.error('Erreur lors de la vérification:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========================================
// 🔔 SEND NOTIFICATION TO USER(S)
// ========================================
router.post('/send-notification', async (req, res) => {
  try {
    const { title, message, sendToAll, userId } = req.body;

    // ✅ Validation
    if (!title || !message) {
      return res.status(400).json({ 
        message: 'Le titre et le message sont requis' 
      });
    }

    if (title.length > 100) {
      return res.status(400).json({ 
        message: 'Le titre ne peut pas dépasser 100 caractères' 
      });
    }

    if (message.length > 500) {
      return res.status(400).json({ 
        message: 'Le message ne peut pas dépasser 500 caractères' 
      });
    }

    const notification = {
      title: title.trim(),
      message: message.trim(),
      text: message.trim(), // Pour compatibilité avec le Header
      read: false,
      createdAt: new Date(),
      type: 'admin' // Notification de type admin
    };

    if (sendToAll) {
      // 📢 Envoyer à tous les utilisateurs
      const result = await User.updateMany(
        {}, 
        { $push: { notifications: notification } }
      );

      console.log(`✅ Notification envoyée à ${result.modifiedCount} utilisateur(s)`);

      return res.json({ 
        success: true,
        message: `Notification envoyée à ${result.modifiedCount} utilisateur(s)`,
        count: result.modifiedCount
      });

    } else if (userId) {
      // 📨 Envoyer à un utilisateur spécifique
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ 
          message: 'Utilisateur non trouvé' 
        });
      }

      // Initialiser le tableau notifications si nécessaire
      if (!user.notifications) {
        user.notifications = [];
      }

      user.notifications.push(notification);
      await user.save();

      console.log(`✅ Notification envoyée à ${user.fullName || user.email}`);
      
      return res.json({ 
        success: true,
        message: `Notification envoyée à ${user.fullName || user.email}`,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email
        }
      });
    }

    return res.status(400).json({ 
      message: 'Vous devez spécifier soit sendToAll=true, soit un userId' 
    });

  } catch (error) {
    console.error('❌ Erreur envoi notification:', error);
    return res.status(500).json({ 
      message: 'Erreur serveur lors de l\'envoi de la notification',
      error: error.message 
    });
  }
});
// ========================================
// GET STATS
// ========================================
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, totalPosts, bannedUsers, verifiedUsers] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      User.countDocuments({ isBanned: true }),
      User.countDocuments({ isVerified: true }),
    ]);
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        totalPosts,
        bannedUsers,
        verifiedUsers,
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des stats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========================================
// GET ALL POSTS (ADMIN)
// ========================================
router.get('/posts', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'username email fullName')
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.json({ 
      success: true, 
      posts,
      total: posts.length 
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des posts:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========================================
// DELETE POST (ADMIN)
// ========================================
router.delete('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const post = await Post.findByIdAndDelete(id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post introuvable' });
    }
    
    res.json({ 
      success: true, 
      message: 'Post supprimé avec succès' 
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du post:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
