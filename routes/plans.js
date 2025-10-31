// routes/plans.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import PlanModel from "../models/Plan.js"; // Schema mongoose pour plan

const router = express.Router();
const upload = multer({ dest: "uploads/" }); // dossier temporaire

router.post("/upload", upload.array("plans"), async (req, res) => {
  try {
    const { userId, projectType } = req.body;
    const plans = [];

    for (const file of req.files) {
      const targetPath = path.join("uploads", file.originalname);
      fs.renameSync(file.path, targetPath);

      const newPlan = await PlanModel.create({
        userId,
        projectType,
        name: file.originalname,
        path: targetPath,
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
