// ========================================
// routes/followRoutes.js - Gestion des follows
// ========================================
import express from 'express';
import User from '../models/User.js';
import mongoose from 'mongoose';

const router = express.Router();

// ========================================
// FOLLOW USER
// ========================================
router.post('/follow/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;

    // Vérifier que l'utilisateur n'essaie pas de se suivre lui-même
    if (id === currentUserId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas vous suivre vous-même' });
    }

    // Vérifier que l'ID est valide
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID utilisateur invalide' });
    }

    // Récupérer les deux utilisateurs
    const [userToFollow, currentUser] = await Promise.all([
      User.findById(id),
      User.findById(currentUserId)
    ]);

    if (!userToFollow) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    if (!currentUser) {
      return res.status(404).json({ error: 'Votre compte est introuvable' });
    }

    // Vérifier si déjà suivi
    if (currentUser.following.includes(id)) {
      return res.status(400).json({ error: 'Vous suivez déjà cet utilisateur' });
    }

    // Ajouter aux listes
    currentUser.following.push(id);
    userToFollow.followers.push(currentUserId);

    // Sauvegarder
    await Promise.all([
      currentUser.save(),
      userToFollow.save()
    ]);

    res.json({
      success: true,
      message: 'Utilisateur suivi avec succès',
      following: currentUser.following.length,
      followers: userToFollow.followers.length
    });
  } catch (error) {
    console.error('Erreur lors du follow:', error);
    res.status(500).json({ error: 'Erreur serveur lors du follow' });
  }
});

// ========================================
// UNFOLLOW USER
// ========================================
router.delete('/unfollow/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;

    // Vérifier que l'ID est valide
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID utilisateur invalide' });
    }

    // Récupérer les deux utilisateurs
    const [userToUnfollow, currentUser] = await Promise.all([
      User.findById(id),
      User.findById(currentUserId)
    ]);

    if (!userToUnfollow) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    if (!currentUser) {
      return res.status(404).json({ error: 'Votre compte est introuvable' });
    }

    // Vérifier si effectivement suivi
    if (!currentUser.following.includes(id)) {
      return res.status(400).json({ error: 'Vous ne suivez pas cet utilisateur' });
    }

    // Retirer des listes
    currentUser.following = currentUser.following.filter(
      followId => followId.toString() !== id
    );
    userToUnfollow.followers = userToUnfollow.followers.filter(
      followerId => followerId.toString() !== currentUserId
    );

    // Sauvegarder
    await Promise.all([
      currentUser.save(),
      userToUnfollow.save()
    ]);

    res.json({
      success: true,
      message: 'Utilisateur unfollow avec succès',
      following: currentUser.following.length,
      followers: userToUnfollow.followers.length
    });
  } catch (error) {
    console.error('Erreur lors du unfollow:', error);
    res.status(500).json({ error: 'Erreur serveur lors du unfollow' });
  }
});

// ========================================
// GET FOLLOWERS
// ========================================
router.get('/followers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID utilisateur invalide' });
    }

    const user = await User.findById(id)
      .populate('followers', 'username fullName email profilePicture isVerified')
      .select('followers');

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    res.json({
      success: true,
      followers: user.followers,
      total: user.followers.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des followers:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========================================
// GET FOLLOWING
// ========================================
router.get('/following/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID utilisateur invalide' });
    }

    const user = await User.findById(id)
      .populate('following', 'username fullName email profilePicture isVerified')
      .select('following');

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    res.json({
      success: true,
      following: user.following,
      total: user.following.length
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des following:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========================================
// CHECK IF FOLLOWING
// ========================================
router.get('/check/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID utilisateur invalide' });
    }

    const currentUser = await User.findById(currentUserId).select('following');

    if (!currentUser) {
      return res.status(404).json({ error: 'Utilisateur introuvable' });
    }

    const isFollowing = currentUser.following.some(
      followId => followId.toString() === id
    );

    res.json({
      success: true,
      isFollowing
    });
  } catch (error) {
    console.error('Erreur lors de la vérification du follow:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;