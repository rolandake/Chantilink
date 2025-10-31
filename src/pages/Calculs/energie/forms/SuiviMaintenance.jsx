import React from 'react';
import { useState } from 'react';

export default function SuiviMaintenance() {
  const [dateIntervention, setDateIntervention] = useState("");
  const [typeMaintenance, setTypeMaintenance] = useState("");
  const [techniciens, setTechniciens] = useState("");
  const [descriptionTravaux, setDescriptionTravaux] = useState("");
  const [resultats, setResultats] = useState("");
  const [commentaire, setCommentaire] = useState("");

  const handleReset = () => {
    setDateIntervention("");
    setTypeMaintenance("");
    setTechniciens("");
    setDescriptionTravaux("");
    setResultats("");
    setCommentaire("");
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">
        🛠️ Suivi & Maintenance
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block mb-1 font-semibold text-orange-300">
            Date de l'intervention
          </label>
          <input
            type="date"
            value={dateIntervention}
            onInput={(e) => setDateIntervention(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-300">
            Type de maintenance
          </label>
          <input
            type="text"
            placeholder="Ex : Préventive, corrective"
            value={typeMaintenance}
            onInput={(e) => setTypeMaintenance(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-300">
            Techniciens impliqués
          </label>
          <input
            type="text"
            placeholder="Nom des techniciens"
            value={techniciens}
            onInput={(e) => setTechniciens(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-300">
            Description des travaux réalisés
          </label>
          <textarea
            rows="3"
            placeholder="Détails de l'intervention"
            value={descriptionTravaux}
            onInput={(e) => setDescriptionTravaux(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 resize-y"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-300">
            Résultats / observations
          </label>
          <textarea
            rows="3"
            placeholder="Résultats et observations"
            value={resultats}
            onInput={(e) => setResultats(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 resize-y"
          />
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
            onClick={() => alert("✅ Données sauvegardées (simulation)")}
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
        </div>
      </div>
    </div>
  );
}


