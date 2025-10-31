import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; // 👈 OBLIGATOIRE pour que autoTable fonctionne

export function generatePDF(costs, currency = "FCFA") {
  const doc = new jsPDF();

  // Créer un tableau des données
  const rows = Object.entries(costs).map(([key, value]) => [
    key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1"),
    `${value.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${currency}`,
  ]);

  // Titre
  doc.setFontSize(18);
  doc.setTextColor(255, 87, 34);
  doc.text("🧾 Résumé du Projet BTP IA", 14, 20);

  // Tableau des coûts
  autoTable(doc, {
    startY: 30,
    head: [["Section", "Coût"]],
    body: rows,
    styles: {
      fontSize: 11,
    },
    headStyles: {
      fillColor: [255, 87, 34], // orange vif
    },
  });

  // Total général
  const total = Object.values(costs).reduce((a, b) => a + b, 0);
  doc.setFontSize(14);
  doc.setTextColor(34, 139, 34); // vert foncé
  doc.text(
    `✅ Total général : ${total.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
    })} ${currency}`,
    14,
    doc.lastAutoTable.finalY + 10
  );

  // Sauvegarde
  doc.save("Projet_BTP_IA_Export.pdf");
}
