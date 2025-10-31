import React from 'react';
import { useState } from 'react';
import jsPDF from "jspdf";

export default function ObtentionAutorisations() {
  const [typeAutorisation, setTypeAutorisation] = useState("");
  const [etatDemande, setEtatDemande] = useState("en_attente");
  const [dateDemande, setDateDemande] = useState("");
  const [dateReception, setDateReception] = useState("");
  const [commentaire, setCommentaire] = useState("");

  const handleReset = () => {
    setTypeAutorisation("");
    setEtatDemande("en_attente");
    setDateDemande("");
    setDateReception("");
    setCommentaire("");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setTextColor(60, 60, 60); // Gris foncé lisible
    doc.text("Obtention des autorisations", 20, 20); // ✅ Sans emoji

    doc.setFontSize(12);
    doc.setTextColor(0);

    doc.text(`- Type autorisation : ${typeAutorisation}`, 20, 40);
    doc.text(`- Etat de la demande : ${etatDemande}`, 20, 50);
    doc.text(`- Date demande : ${dateDemande}`, 20, 60);
    doc.text(`- Date reception : ${dateReception}`, 20, 70);
    doc.text("- Commentaire :", 20, 80);

    const commentLines = doc.splitTextToSize(commentaire, 170);
    doc.text(commentLines, 25, 90);

    doc.save("autorisation.pdf");
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">
        📝 Obtention des autorisations administratives
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block mb-1 font-semibold text-orange-300">Type d'autorisation</label>
          <input
            type="text"
            placeholder="Ex: Permis de construire, Environnement"
            value={typeAutorisation}
            onInput={(e) => setTypeAutorisation(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-300">Etat de la demande</label>
          <select
            value={etatDemande}
            onChange={(e) => setEtatDemande(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"
          >
            <option value="en_attente">En attente</option>
            <option value="accordee">Accordee</option>
            <option value="refusee">Refusee</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-semibold text-orange-300">Date de la demande</label>
            <input
              type="date"
              value={dateDemande}
              onInput={(e) => setDateDemande(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold text-orange-300">Date de réception</label>
            <input
              type="date"
              value={dateReception}
              onInput={(e) => setDateReception(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"
            />
          </div>
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-300">Commentaires</label>
          <textarea
            rows="3"
            placeholder="Informations complementaires"
            value={commentaire}
            onInput={(e) => setCommentaire(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 resize-y"
          />
        </div>

        <div className="flex justify-center gap-4 flex-wrap mt-4">
          <button
            onClick={() => alert("✅ Donnees sauvegardees (simulation)")}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold"
          >
            💾 Sauvegarder
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded font-semibold"
          >
            🔄 Reinitialiser
          </button>
          <button
            onClick={handleExportPDF}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold"
          >
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}


