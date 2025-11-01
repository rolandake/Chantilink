// routes/plans.js
import express from "express";
import multer from "multer";
import fs from "fs";
import PlanModel from "../models/Plan.js";
import { uploadFile } from "../utils/cloudinaryServer.js";

const router = express.Router();
const upload = multer({ dest: "tmp/" }); // stockage temporaire

router.post("/upload", upload.array("plans"), async (req, res) => {
  try {
    const { userId, projectType } = req.body;
    const plans = [];

    for (const file of req.files) {
      // Upload sur Cloudinary
      const result = await cloudinary.uploader.upload(file.path, {
        resource_type: "auto", // image, vidéo, PDF, etc.
        folder: `plans/${userId}`, // organise par utilisateur
      });

      // Supprimer fichier temporaire
      fs.unlinkSync(file.path);

      // Sauvegarder en DB
      const newPlan = await PlanModel.create({
        userId,
        projectType,
        name: file.originalname,
        path: result.secure_url, // URL Cloudinary
        type: file.mimetype,
        createdAt: new Date(),
      });

      plans.push(newPlan);
    }

    res.status(200).json({ success: true, plans });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Upload failed" });
  }
});

export default router;
