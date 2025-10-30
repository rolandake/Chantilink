import Projet from "../models/Projet.js";

// CRUD pour Projet
export const createProjet = async (req, res) => {
  try {
    const { name, description, owner } = req.body;
    const projet = new Projet({ name, description, owner });
    await projet.save();
    res.status(201).json(projet);
  } catch (err) {
    res.status(500).json({ error: "Erreur création du projet" });
  }
};




