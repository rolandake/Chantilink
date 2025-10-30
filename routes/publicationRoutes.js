import express from "express";
import Publication from "../models/Publication.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();

// Créer une publication
router.post("/", verifyToken, async (req, res) => {
  try {
    const { content, imageUrl } = req.body;
    const newPost = await Publication.create({
      author: req.userId,
      content,
      imageUrl,
    });
    res.status(201).json(newPost);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Voir publications des personnes suivies
router.get("/feed", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const posts = await Publication.find({
      author: { $in: [...user.following, req.userId] },
    })
      .populate("author", "username")
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Liker / unliker une publication
router.post("/:id/like", verifyToken, async (req, res) => {
  try {
    const post = await Publication.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Introuvable" });

    const index = post.likes.indexOf(req.userId);
    if (index === -1) {
      post.likes.push(req.userId);
    } else {
      post.likes.splice(index, 1);
    }

    await post.save();
    res.json({ message: "Like mis à jour", likes: post.likes.length });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Commenter une publication
router.post("/:id/comment", verifyToken, async (req, res) => {
  try {
    const post = await Publication.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Introuvable" });

    const comment = {
      author: req.userId,
      text: req.body.text,
    };

    post.comments.push(comment);
    await post.save();

    res.status(201).json({ message: "Commentaire ajouté", comments: post.comments });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});


export default router;
