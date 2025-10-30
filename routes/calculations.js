import express from "express";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { verifyToken } from "../middleware/auth.js";
import Calculation from "../models/Calculation.js";

const router = express.Router();

// --- Sauvegarder un calcul ---
router.post("/", verifyToken, async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Utilisateur non authentifié" });

    const data = req.body;
    data.userId = req.user.id;
    data.projectType = data.projectType || data.type || "tp";
    data.calculationType = data.calculationType || data.category || "general";

    const newCalc = new Calculation(data);
    await newCalc.save();

    console.log(`✅ Calcul sauvegardé: ${newCalc._id}`);
    res.status(201).json(newCalc);
  } catch (err) {
    console.error("❌ Erreur sauvegarde calcul:", err);
    res.status(500).json({ message: "Erreur lors de la sauvegarde des calculs" });
  }
});

// --- Récupérer les calculs filtrés et paginés ---
router.get("/", verifyToken, async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Utilisateur non authentifié" });

    const { page = 1, limit = 20, projectType, calculationType, startDate, endDate } = req.query;
    const filter = { userId: req.user.id };
    if (projectType) filter.projectType = projectType;
    if (calculationType) filter.calculationType = calculationType;
    if (startDate || endDate) filter.savedAt = {
      ...(startDate && { $gte: new Date(startDate) }),
      ...(endDate && { $lte: new Date(endDate) }),
    };

    const calculs = await Calculation.find(filter)
      .sort({ savedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Calculation.countDocuments(filter);
    res.json({ calculs, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error("❌ Erreur récupération calculs:", err);
    res.status(500).json({ message: "Erreur lors de la récupération des calculs" });
  }
});

// --- Export PDF ultra-détaillé ---
router.post("/export/pdf", verifyToken, async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Utilisateur non authentifié" });

    const { projectType, calculationType, startDate, endDate } = req.body;
    const filter = { userId: req.user.id };
    if (projectType) filter.projectType = projectType;
    if (calculationType) filter.calculationType = calculationType;
    if (startDate || endDate) filter.savedAt = {
      ...(startDate && { $gte: new Date(startDate) }),
      ...(endDate && { $lte: new Date(endDate) }),
    };

    const calculs = await Calculation.find(filter).sort({ savedAt: -1 });
    const exportsDir = path.resolve("exports");
    if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir);

    const filename = `calculs_details_${Date.now()}.pdf`;
    const filepath = path.join(exportsDir, filename);

    const doc = new PDFDocument({ margin: 20 });
    doc.pipe(fs.createWriteStream(filepath));

    doc.fontSize(18).text("Export détaillé Calculs TP", { underline: true });
    doc.moveDown();

    if (!calculs.length) {
      doc.fontSize(12).text("Aucun calcul trouvé pour les filtres donnés.");
    } else {
      calculs.forEach((c, i) => {
        doc.fontSize(14).text(`Calcul #${i + 1}`, { underline: true });
        doc.fontSize(12).text(`Type: ${c.calculationType}`);
        doc.text(`Projet: ${c.projectType}`);
        doc.text(`Date: ${c.savedAt?.toLocaleString() || "N/A"}`);
        doc.moveDown(0.5);

        // Inputs
        const inputs = c.inputs || {};
        doc.text("⚙️ Inputs", { underline: true });
        Object.entries(inputs).forEach(([key, value]) => {
          if (typeof value !== "object") doc.text(`- ${key}: ${value}`);
        });

        // Matériaux
        const materiaux = inputs.materiaux || {};
        if (Object.keys(materiaux).length) {
          doc.text("🧱 Matériaux", { underline: true });
          Object.entries(materiaux).forEach(([m, val]) => {
            doc.text(`- ${m}: ${val?.quantite || 0}`);
          });
        }

        // Results
        const results = c.results || {};
        if (Object.keys(results).length) {
          doc.text("💰 Résultats", { underline: true });
          Object.entries(results).forEach(([r, val]) => {
            doc.text(`- ${r}: ${val}`);
          });
        }
        doc.moveDown();
      });
    }

    doc.end();
    doc.on("end", () => console.log("PDF généré:", filepath));
    doc.pipe(fs.createWriteStream(filepath)).on("finish", () => res.download(filepath, filename));
  } catch (err) {
    console.error("❌ Erreur export PDF:", err);
    res.status(500).json({ message: "Erreur lors de l’export PDF" });
  }
});

// --- Export Excel ultra-détaillé ---
router.post("/export/excel", verifyToken, async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: "Utilisateur non authentifié" });

    const { projectType, calculationType, startDate, endDate } = req.body;
    const filter = { userId: req.user.id };
    if (projectType) filter.projectType = projectType;
    if (calculationType) filter.calculationType = calculationType;
    if (startDate || endDate) filter.savedAt = {
      ...(startDate && { $gte: new Date(startDate) }),
      ...(endDate && { $lte: new Date(endDate) }),
    };

    const calculs = await Calculation.find(filter).sort({ savedAt: -1 });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Calculs TP Détaillés");

    // Header
    sheet.columns = [
      { header: "ID", key: "id", width: 24 },
      { header: "Type", key: "type", width: 15 },
      { header: "Projet", key: "project", width: 15 },
      { header: "Date", key: "date", width: 25 },
      { header: "Champ / Matériau / Résultat", key: "field", width: 30 },
      { header: "Valeur", key: "value", width: 20 },
    ];

    calculs.forEach(c => {
      const baseRow = {
        id: c._id.toString(),
        type: c.calculationType,
        project: c.projectType,
        date: c.savedAt?.toLocaleString() || "N/A",
      };

      // Inputs
      const inputs = c.inputs || {};
      Object.entries(inputs).forEach(([key, val]) => {
        if (typeof val !== "object") {
          sheet.addRow({ ...baseRow, field: key, value: val });
        }
      });

      // Matériaux
      const materiaux = inputs.materiaux || {};
      Object.entries(materiaux).forEach(([m, v]) => {
        sheet.addRow({ ...baseRow, field: `Matériau: ${m}`, value: v?.quantite || 0 });
      });

      // Results
      const results = c.results || {};
      Object.entries(results).forEach(([r, v]) => {
        sheet.addRow({ ...baseRow, field: `Résultat: ${r}`, value: v });
      });

      sheet.addRow({}); // ligne vide pour séparer les calculs
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=calculs_details_${Date.now()}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (err) {
    console.error("❌ Erreur export Excel:", err);
    res.status(500).json({ message: "Erreur lors de l’export Excel" });
  }
});

export default router;
