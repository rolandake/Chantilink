import React from 'react';
import { useState } from 'react';
import jsPDF from "jspdf";

export default function PreparationSite() {
  const [nettoyage, setNettoyage] = useState(false);
  const [terrassement, setTerrassement] = useState(false);
  const [nivellement, setNivellement] = useState(false);
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [commentaire, setCommentaire] = useState("");

  const handleReset = () => {
    setNettoyage(false);
    setTerrassement(false);
    setNivellement(false);
    setDateDebut("");
    setDateFin("");
    setCommentaire("");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Préparation du site", 14, 20);

    doc.setFontSize(12);

    doc.text(`Nettoyage du site : ${nettoyage ? "Oui" : "Non"}`, 14, 40);
    doc.text(`Terrassement : ${terrassement ? "Oui" : "Non"}`, 14, 50);
    doc.text(`Nivellement : ${nivellement ? "Oui" : "Non"}`, 14, 60);

    doc.text(`Date de début : ${dateDebut || "-"}`, 14, 70);
    doc.text(`Date de fin : ${dateFin || "-"}`, 14, 80);

    doc.text("Commentaires :", 14, 90);
    const splitComment = doc.splitTextToSize(commentaire || "-", 180);
    doc.text(splitComment, 14, 100);

    doc.save("Preparation_Site.pdf");
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">
        🏗️ Préparation du site
      </h2>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="nettoyage"
            checked={nettoyage}
            onChange={(e) => setNettoyage(e.target.checked)}
            className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-700 rounded"
          />
          <label for="nettoyage" className="font-semibold text-orange-300">
            Nettoyage du site
          </label>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="terrassement"
            checked={terrassement}
            onChange={(e) => setTerrassement(e.target.checked)}
            className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-700 rounded"
          />
          <label for="terrassement" className="font-semibold text-orange-300">
            Terrassement
          </label>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="nivellement"
            checked={nivellement}
            onChange={(e) => setNivellement(e.target.checked)}
            className="w-5 h-5 text-orange-500 bg-gray-800 border-gray-700 rounded"
          />
          <label for="nivellement" className="font-semibold text-orange-300">
            Nivellement
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-semibold text-orange-300">
              Date de début
            </label>
            <input
              type="date"
              value={dateDebut}
              onInput={(e) => setDateDebut(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold text-orange-300">
              Date de fin
            </label>
            <input
              type="date"
              value={dateFin}
              onInput={(e) => setDateFin(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"
            />
          </div>
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-300">
            Commentaires
          </label>
          <textarea
            rows="3"
            placeholder="Informations complémentaires"
            value={commentaire}
            onInput={(e) => setCommentaire(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 resize-y"
          />
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={() => alert("Données sauvegardées (simulation)")}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold"
          >
            💾 Sauvegarder
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded font-semibold"
          >
            🔄 Réinitialiser
          </button>
          <button
            onClick={handleExportPDF}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold"
          >
            📄 Exporter PDF
          </button>
        </div>
      </div>
    </div>
  );
}


