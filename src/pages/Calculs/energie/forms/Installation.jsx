import React from 'react';
import { useState } from 'react';

export default function Installation() {
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [equipeResponsable, setEquipeResponsable] = useState("");
  const [materielUtilise, setMaterielUtilise] = useState("");
  const [commentaire, setCommentaire] = useState("");

  const handleReset = () => {
    setDateDebut("");
    setDateFin("");
    setEquipeResponsable("");
    setMaterielUtilise("");
    setCommentaire("");
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">
        ⚙️ Installation
      </h2>

      <div className="space-y-4">
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
            Équipe responsable
          </label>
          <input
            type="text"
            placeholder="Nom de l'équipe ou des intervenants"
            value={equipeResponsable}
            onInput={(e) => setEquipeResponsable(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-300">
            Matériel utilisé
          </label>
          <textarea
            rows="3"
            placeholder="Liste ou description du matériel"
            value={materielUtilise}
            onInput={(e) => setMaterielUtilise(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 resize-y"
          />
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


