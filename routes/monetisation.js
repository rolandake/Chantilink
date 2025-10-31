import express from "express";
import Offer from "../models/Offer.js";
import Transaction from "../models/Transaction.js";
import { verifyToken } from "../middleware/auth.js";
import { requireVerified } from "../middleware/requireVerified.js";
import { requirePremium } from "../middleware/requirePremium.js";

const router = express.Router();

// ✅ Créer une offre (vérifié uniquement)
router.post("/offers", verifyToken, requireVerified, async (req, res) => {
  const { title, description, price } = req.body;

  if (!title || typeof price !== "number" || price <= 0) {
    return res.status(400).json({ message: "Titre et prix valide requis." });
  }

  try {
    const newOffer = new Offer({
      title,
      description: description || "",
      price,
      creator: req.user.id,
    });

    await newOffer.save();
    res.status(201).json({ message: "Offre créée avec succès.", offer: newOffer });
  } catch (err) {
    console.error("Erreur création offre:", err);
    res.status(500).json({ message: "Erreur lors de la création de l’offre." });
  }
});

// ✅ Récupérer toutes les offres du vendeur connecté (vérifié uniquement)
router.get("/offers", verifyToken, requireVerified, async (req, res) => {
  try {
    const offers = await Offer.find({ creator: req.user.id }).sort({ createdAt: -1 });
    res.json({ offers });
  } catch (err) {
    console.error("Erreur récupération offres :", err);
    res.status(500).json({ message: "Erreur serveur lors de la récupération des offres." });
  }
});

// ✅ Modifier une offre par id (vérifié uniquement)
router.put("/offers/:id", verifyToken, requireVerified, async (req, res) => {
  const { id } = req.params;
  const { title, description, price } = req.body;

  if (!title || typeof price !== "number" || price <= 0) {
    return res.status(400).json({ message: "Titre et prix valide requis." });
  }

  try {
    const offer = await Offer.findOne({ _id: id, creator: req.user.id });
    if (!offer) return res.status(404).json({ message: "Offre non trouvée." });

    offer.title = title;
    offer.description = description || "";
    offer.price = price;

    await offer.save();
    res.json({ message: "Offre mise à jour avec succès.", offer });
  } catch (err) {
    console.error("Erreur mise à jour offre :", err);
    res.status(500).json({ message: "Erreur serveur lors de la mise à jour." });
  }
});

// ✅ Supprimer une offre par id (vérifié uniquement)
router.delete("/offers/:id", verifyToken, requireVerified, async (req, res) => {
  const { id } = req.params;

  try {
    const offer = await Offer.findOneAndDelete({ _id: id, creator: req.user.id });
    if (!offer) return res.status(404).json({ message: "Offre non trouvée." });

    res.json({ message: "Offre supprimée avec succès." });
  } catch (err) {
    console.error("Erreur suppression offre :", err);
    res.status(500).json({ message: "Erreur serveur lors de la suppression." });
  }
});

// ✅ Demander un retrait (premium uniquement)
router.post("/withdraw", verifyToken, requirePremium, async (req, res) => {
  const { amount } = req.body;

  if (!amount || typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ message: "Montant de retrait invalide." });
  }

  // TODO: Implémenter la logique réelle de retrait (enregistrer demande, vérifier solde, etc.)

  res.status(200).json({ message: `Demande de retrait de ${amount} FCFA reçue.` });
});

// ✅ Récupérer les transactions liées à l'utilisateur connecté (acheteur ou vendeur)
router.get("/transactions", verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const transactions = await Transaction.find({
      $or: [{ buyer: userId }, { seller: userId }],
    })
      .populate("offer", "title")
      .populate("buyer", "username")
      .populate("seller", "username")
      .sort({ date: -1 })
      .exec();

    const formatted = transactions.map((tx) => ({
      _id: tx._id,
      offerTitle: tx.offer?.title || "Offre supprimée",
      buyerUsername: tx.buyer?.username || "Utilisateur supprimé",
      sellerUsername: tx.seller?.username || "Utilisateur supprimé",
      amount: tx.amount,
      date: tx.date,
      status: tx.status,
    }));

    res.json({ transactions: formatted });
  } catch (err) {
    console.error("Erreur récupération transactions :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;
