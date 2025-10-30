// routes/projects.js
import express from "express";
import Joi from "joi";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import Project from "../models/ProjectModel.js";
import { verifyToken } from "../middleware/auth.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import OpenAI from "openai";

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ------------------------------
// 🔧 Config multer (upload plans)
// ------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/plans"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});
const upload = multer({ storage });

// ------------------------------
// 🛡️ Validation avec Joi
// ------------------------------
const projectSchemaValidation = Joi.object({
  nom: Joi.string().max(100).required(),
  typeProjet: Joi.string()
    .valid(
      "bâtiment",
      "écologie",
      "énergie",
      "ferroviaire",
      "géotechnique",
      "hydraulique",
      "maritime",
      "réhabilitation",
      "rural",
      "travaux publics"
    )
    .required(),
  informations: Joi.object({
    surface: Joi.number().min(0),
    etage: Joi.number().min(0),
    terrain: Joi.string(),
    localisation: Joi.string(),
  }),
});

// ------------------------------
// ➕ Créer un projet
// ------------------------------
router.post("/", verifyToken, async (req, res) => {
  const { error } = projectSchemaValidation.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  try {
    const project = new Project({
      ...req.body,
      createdBy: req.user.id,
      collaborateurs: [{ user: req.user.id, role: "propriétaire" }],
    });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ------------------------------
// 📖 Lire projets (filtres, pagination, recherche)
// ------------------------------
router.get("/", verifyToken, async (req, res) => {
  const { page = 1, limit = 10, search = "", sort = "createdAt", order = "desc" } = req.query;
  const regex = new RegExp(search, "i");

  try {
    const query = {
      $or: [
        { createdBy: req.user.id },
        { "collaborateurs.user": req.user.id },
      ],
      nom: { $regex: regex },
    };

    const projets = await Project.find(query)
      .sort({ [sort]: order === "asc" ? 1 : -1 })
      .limit(parseInt(limit))
      .skip((page - 1) * limit);

    const total = await Project.countDocuments(query);
    res.json({ projets, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ------------------------------
// ✏️ Mettre à jour un projet
// ------------------------------
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "Projet introuvable" });

    const collab = project.collaborateurs.find(c => c.user.toString() === req.user.id);
    if (!collab || !["propriétaire", "éditeur"].includes(collab.role)) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    Object.assign(project, req.body);
    await project.save();
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ------------------------------
// ❌ Supprimer un projet
// ------------------------------
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "Projet introuvable" });

    const collab = project.collaborateurs.find(c => c.user.toString() === req.user.id);
    if (!collab || collab.role !== "propriétaire") {
      return res.status(403).json({ error: "Accès refusé" });
    }

    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: "Projet supprimé" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ------------------------------
// 📄 Upload d’un plan
// ------------------------------
router.post("/:id/upload-plan", verifyToken, upload.single("plan"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Fichier manquant" });

  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "Projet introuvable" });

    const collab = project.collaborateurs.find(c => c.user.toString() === req.user.id);
    if (!collab || !["propriétaire", "éditeur"].includes(collab.role)) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    project.plans.push({
      url: `/uploads/plans/${req.file.filename}`,
      nom: req.file.originalname,
      date: new Date(),
    });
    await project.save();
    res.json(project.plans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ------------------------------
// 📊 Export Excel
// ------------------------------
router.get("/:id/export/excel", verifyToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "Projet introuvable" });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Projet");

    sheet.addRow(["Nom", "Type", "Surface", "Étages", "Localisation"]);
    sheet.addRow([
      project.nom,
      project.typeProjet,
      project.informations?.surface || "",
      project.informations?.etage || "",
      project.informations?.localisation || "",
    ]);

    const filePath = path.join(__dirname, "../exports", `${project._id}.xlsx`);
    await workbook.xlsx.writeFile(filePath);
    res.download(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur export Excel" });
  }
});

// ------------------------------
// 📑 Export PDF
// ------------------------------
router.get("/:id/export/pdf", verifyToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "Projet introuvable" });

    const filePath = path.join(__dirname, "../exports", `${project._id}.pdf`);
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(20).text(`Projet : ${project.nom}`, { underline: true });
    doc.moveDown();
    doc.text(`Type : ${project.typeProjet}`);
    doc.text(`Surface : ${project.informations?.surface || "N/A"}`);
    doc.text(`Étages : ${project.informations?.etage || "N/A"}`);
    doc.text(`Localisation : ${project.informations?.localisation || "N/A"}`);
    doc.moveDown();

    doc.fontSize(16).text("Plans disponibles :", { underline: true });
    project.plans.forEach(plan => {
      doc.text(`- ${plan.nom} (${plan.date.toISOString().split("T")[0]})`);
    });

    doc.end();
    stream.on("finish", () => res.download(filePath));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur export PDF" });
  }
});

// ------------------------------
// 🤖 Analyse IA GPT-5
// ------------------------------
router.post("/:id/analyse", verifyToken, async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: "Question manquante" });

  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "Projet introuvable" });

    const response = await openai.chat.completions.create({
      model: "GTP-5",
      messages: [
        { role: "system", content: "Tu es une IA experte en BTP et génie civil." },
        { role: "user", content: question },
      ],
      max_tokens: 2500,
      temperature: 0.5,
    });

    const iaResponse = response.choices[0].message.content;
    project.analyses.push({
      typeAnalyse: "IA",
      données: { question, réponse: iaResponse },
      date: new Date(),
    });
    project.resultIA = iaResponse;
    await project.save();

    res.json({ question, réponse: iaResponse });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur analyse IA" });
  }
});

// ------------------------------
// 🤖 Analyse + PDF complet avec plans
// ------------------------------
router.post("/:id/analyse-pdf-avec-plans", verifyToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: "Projet introuvable" });

    const prompt = `
Tu es une IA experte en BTP et génie civil.
Analyse ce projet et fais un rapport complet :
Nom : ${project.nom}
Type : ${project.typeProjet}
Surface : ${project.informations?.surface || "N/A"}
Étages : ${project.informations?.etage || "N/A"}
Localisation : ${project.informations?.localisation || "N/A"}
Plans disponibles : ${project.plans.length} plan(s)
`;

    const response = await openai.chat.completions.create({
      model: "GTP-5",
      messages: [
        { role: "system", content: "Tu es une IA experte en BTP et génie civil." },
        { role: "user", content: prompt },
      ],
      max_tokens: 2500,
      temperature: 0.5,
    });

    const iaResponse = response.choices[0].message.content;
    project.analyses.push({ typeAnalyse: "IA", données: { analyse: iaResponse }, date: new Date() });
    project.resultIA = iaResponse;
    await project.save();

    // Création PDF
    const fileName = `${project._id}_rapport_complet.pdf`;
    const filePath = path.join(__dirname, "../exports", fileName);
    const doc = new PDFDocument({ margin: 30 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(20).text(`Projet : ${project.nom}`, { underline: true });
    doc.moveDown();
    doc.fontSize(14).text(`Type : ${project.typeProjet}`);
    doc.text(`Surface : ${project.informations?.surface || "N/A"}`);
    doc.text(`Étages : ${project.informations?.etage || "N/A"}`);
    doc.text(`Localisation : ${project.informations?.localisation || "N/A"}`);
    doc.moveDown();

    doc.fontSize(16).text("📄 Analyse IA", { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(iaResponse);
    doc.addPage();

    // Ajouter plans images
    for (const plan of project.plans) {
      const planPath = path.join(__dirname, "..", plan.url);
      if (fs.existsSync(planPath)) {
        doc.addPage();
        doc.fontSize(14).text(`Plan : ${plan.nom}`, { underline: true });
        doc.image(planPath, { fit: [500, 400], align: "center", valign: "center" });
      }
    }

    doc.end();
    stream.on("finish", () => res.download(filePath));
  } catch (err) {
    console.error("❌ Erreur IA + PDF avec plans :", err);
    res.status(500).json({ error: "Erreur serveur lors de l'analyse et génération PDF" });
  }
});

export default router;
