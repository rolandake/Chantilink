import React from 'react';
import { useState } from 'react';
import jsPDF from "jspdf";

export default function ApprovisionnementLogistique() {
  const [fournisseur, setFournisseur] = useState("");
  const [dateCommande, setDateCommande] = useState("");
  const [dateLivraisonPrev, setDateLivraisonPrev] = useState("");
  const [etatLivraison, setEtatLivraison] = useState("en_attente");
  const [commentaire, setCommentaire] = useState("");

  const handleReset = () => {
    setFournisseur("");
    setDateCommande("");
    setDateLivraisonPrev("");
    setEtatLivraison("en_attente");
    setCommentaire("");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Approvisionnement et Logistique", 14, 20);

    doc.setFontSize(12);
    doc.text(`Fournisseur : ${fournisseur || "-"}`, 14, 40);
    doc.text(`Date de commande : ${dateCommande || "-"}`, 14, 50);
    doc.text(`Date livraison prévue : ${dateLivraisonPrev || "-"}`, 14, 60);

    const etatTexte = {
      en_attente: "En attente",
      livree: "Livrée",
      retard: "Retard",
    }[etatLivraison] || "-";

    doc.text(`État de la livraison : ${etatTexte}`, 14, 70);

    doc.text("Commentaires :", 14, 80);
    const splitComment = doc.splitTextToSize(commentaire || "-", 180);
    doc.text(splitComment, 14, 90);

    doc.save("Approvisionnement_Logistique.pdf");
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">
        Approvisionnement et Logistique
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block mb-1 font-semibold text-orange-300">Fournisseur</label>
          <input
            type="text"
            placeholder="Nom du fournisseur"
            value={fournisseur}
            onInput={(e) => setFournisseur(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-semibold text-orange-300">Date de commande</label>
            <input
              type="date"
              value={dateCommande}
              onInput={(e) => setDateCommande(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold text-orange-300">Date livraison prévue</label>
            <input
              type="date"
              value={dateLivraisonPrev}
              onInput={(e) => setDateLivraisonPrev(e.target.value)}
              className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"
            />
          </div>
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-300">État de la livraison</label>
          <select
            value={etatLivraison}
            onChange={(e) => setEtatLivraison(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"
          >
            <option value="en_attente">En attente</option>
            <option value="livree">Livrée</option>
            <option value="retard">Retard</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-300">Commentaires</label>
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
            Sauvegarder
          </button>
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded font-semibold"
          >
            Réinitialiser
          </button>
          <button
            onClick={handleExportPDF}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold"
          >
            Exporter PDF
          </button>
        </div>
      </div>
    </div>
  );
}


