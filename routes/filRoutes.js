import express from "express";
import Post from "../models/Post.js";
import verifyToken from "../middleware/auth.js";

const router = express.Router();

// Récupérer tous les posts
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("auteur", "username")
      .sort({ date: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Créer un post
router.post("/", verifyToken, async (req, res) => {
  try {
    const { contenu } = req.body;
    const nouveauPost = new Post({
      auteur: req.user.userId,
      contenu,
    });
    await nouveauPost.save();
    res.status(201).json(nouveauPost);
  } catch (err) {
    res.status(400).json({ message: "Erreur lors de la création du post" });
  }
});


export default router;
