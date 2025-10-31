import * as XLSX from "xlsx";

export function generateDevisExcel({
  formuleBeton = "",
  coefPerte = 0,
  devise = "FCFA",
  terrassementData = {},
  fondationData = {},
  structureData = {},
  finitionData = {},
}) {
  const wb = XLSX.utils.book_new();

  // Fonction utilitaire pour fixer la largeur des colonnes
  const setColWidths = (ws, widths) => {
    ws['!cols'] = widths.map(w => ({ wch: w }));
  };

  // Feuille infos
  const infos = [
    ["INFORMATIONS GÉNÉRALES", ""],
    ["Formule béton", formuleBeton],
    ["Coefficient de perte (%)", coefPerte],
    ["Devise", devise],
  ];
  const wsInfos = XLSX.utils.aoa_to_sheet(infos);
  setColWidths(wsInfos, [25, 30]);
  XLSX.utils.book_append_sheet(wb, wsInfos, "Infos");

  // Feuille terrassement
  const terr = [
    ["RÉSUMÉ TERRASSEMENT", ""],
    ["Paramètre", "Valeur"],
    ["Longueur (m)", terrassementData.longueur ?? 0],
    ["Largeur (m)", terrassementData.largeur ?? 0],
    ["Profondeur (m)", terrassementData.profondeur ?? 0],
    ["Volume (m³)", Number(terrassementData.volume ?? 0).toFixed(2)],
  ];
  const wsTerr = XLSX.utils.aoa_to_sheet(terr);
  setColWidths(wsTerr, [25, 15]);
  XLSX.utils.book_append_sheet(wb, wsTerr, "Terrassement");

  // Feuille fondation
  const fond = [
    ["RÉSUMÉ FONDATION", ""],
    ["Paramètre", "Valeur"],
    ["Type de fondation", fondationData.typeFondation ?? ""],
    ["Longueur (m)", fondationData.longueur ?? 0],
    ["Largeur (m)", fondationData.largeur ?? 0],
    ["Hauteur (m)", fondationData.hauteur ?? 0],
    ["Volume (m³)", (fondationData.volume ?? 0).toFixed(2)],
    ["Ciment (kg)", (fondationData.qteCimentKg ?? 0).toFixed(0)],
    ["Ciment (sacs)", (fondationData.qteCimentSacs ?? 0).toFixed(1)],
    ["Ciment (tonnes)", (fondationData.qteCimentT ?? 0).toFixed(2)],
    ["Sable (m³)", (fondationData.qteSableM3 ?? 0).toFixed(2)],
    ["Sable (tonnes)", (fondationData.qteSableT ?? 0).toFixed(2)],
    ["Gravier (m³)", (fondationData.qteGravierM3 ?? 0).toFixed(2)],
    ["Gravier (tonnes)", (fondationData.qteGravierT ?? 0).toFixed(2)],
    [`Coût total (${devise})`, (fondationData.coutTotal ?? 0).toFixed(2)],
  ];
  const wsFond = XLSX.utils.aoa_to_sheet(fond);
  setColWidths(wsFond, [30, 15]);
  XLSX.utils.book_append_sheet(wb, wsFond, "Fondation");

  // Feuille structure
  const struct = [
    ["RÉSUMÉ STRUCTURE", "", ""],
    ["Élément", "Donnée", "Valeur"],
  ];
  Object.entries(structureData).forEach(([element, values]) => {
    if (values?.actif) {
      Object.entries(values).forEach(([k, v]) => {
        if (k !== "actif") {
          struct.push([element, k, typeof v === "number" ? v.toFixed(2) : v]);
        }
      });
    }
  });
  const wsStruct = XLSX.utils.aoa_to_sheet(struct);
  setColWidths(wsStruct, [25, 20, 15]);
  XLSX.utils.book_append_sheet(wb, wsStruct, "Structure");

  // Feuille finition
  const fin = [
    ["RÉSUMÉ FINITIONS", "", ""],
    ["Poste", "Donnée", "Valeur"],
  ];
  Object.entries(finitionData).forEach(([poste, values]) => {
    if (values?.actif) {
      Object.entries(values).forEach(([k, v]) => {
        if (k !== "actif") {
          fin.push([poste, k, typeof v === "number" ? v.toFixed(2) : v]);
        }
      });
    }
  });
  const wsFin = XLSX.utils.aoa_to_sheet(fin);
  setColWidths(wsFin, [25, 20, 15]);
  XLSX.utils.book_append_sheet(wb, wsFin, "Finition");

  try {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, "-");
    XLSX.writeFile(wb, `Projet_BTP_IA_Export_${timestamp}.xlsx`);
    console.log("Export Excel généré avec succès !");
  } catch (e) {
    alert("Erreur lors de la génération du fichier Excel : " + e.message);
  }
}
