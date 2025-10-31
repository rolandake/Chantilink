import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export async function generateVisionPdf(vision, filePath) {
  return new Promise((resolve, reject) => {
    // Créer le dossier si nécessaire
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(fs.createWriteStream(filePath));

    // --- Logo ---
    const logoPath = path.join(__dirname, "logo.png"); // <-- Chemin vers ton logo
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 30, { width: 60, height: 60 }); // haut à gauche
    }

    // --- Titre centré ---
    doc.fontSize(20).text(
      "Analyse Vision IA",
      0,
      50,      // légèrement en dessous du logo
      { align: "center" }
    );

    // --- Infos sous le titre ---
    const dateStr = vision.createdAt instanceof Date
      ? vision.createdAt.toLocaleString()
      : new Date(vision.createdAt).toLocaleString();

    doc.fontSize(12).text(
      `Auteur / Application: Chantilink\nDate : ${dateStr}`,
      0,
      80,
      { align: "center" }
    );

    doc.moveDown(4);

    // --- Contenu ---
    doc.fontSize(14).text(`Description :\n${vision.description || "N/A"}\n\n`);
    doc.text(`Confiance : ${vision.confidence ?? "N/A"}%`);

    doc.end();

    doc.on("finish", resolve);
    doc.on("error", reject);
  });
}
