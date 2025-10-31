import React from 'react';
import { useState, useEffect } from 'react';

const STORAGE_KEY = "plateforme-ferroviaire-history";

export default function PlateformeFerroviaire({ onMateriauxChange = () => {} }) {
  const [longueur, setLongueur] = useState("");
  const [largeur, setLargeur] = useState("");
  const [epaisseur, setEpaisseur] = useState(""); // épaisseur remblais/terrassement

  // Calcul volume terrassement/remblais
  const volumeTerrassement =
    parseFloat(longueur) > 0 && parseFloat(largeur) > 0 && parseFloat(epaisseur) > 0
      ? parseFloat(longueur) * parseFloat(largeur) * parseFloat(epaisseur)
      : 0;

  useEffect(() => {
    onMateriauxChange({ volumeTerrassement });
  }, [volumeTerrassement, onMateriauxChange]);

  // Historique localStorage
  const [historique, setHistorique] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistorique(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historique));
  }, [historique]);

  const handleSave = () => {
    if(volumeTerrassement === 0) {
      alert("⚠️ Veuillez saisir des dimensions valides");
      return;
    }
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      longueur,
      largeur,
      epaisseur,
      volumeTerrassement: volumeTerrassement.toFixed(2),
    };
    setHistorique([entry, ...historique]);
    alert("✅ Plateforme sauvegardée !");
  };

  const handleDelete = (id) => {
    if(confirm("🗑️ Supprimer cette entrée ?")) {
      setHistorique(historique.filter(item => item.id !== id));
    }
  };

  const clearHistorique = () => {
    if(confirm("🧹 Vider tout l'historique ?")) {
      setHistorique([]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg text-white font-sans">
      <h3 className="text-xl font-bold text-orange-400 mb-4">Plateforme Ferroviaire</h3>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <label>
          Longueur (m)
          <input
            type="number"
            min="0"
            step="any"
            value={longueur}
            onInput={e => setLongueur(e.target.value)}
            className="mt-1 w-full p-2 rounded bg-gray-800 border border-gray-700"
            placeholder="ex: 1000"
          />
        </label>

        <label>
          Largeur (m)
          <input
            type="number"
            min="0"
            step="any"
            value={largeur}
            onInput={e => setLargeur(e.target.value)}
            className="mt-1 w-full p-2 rounded bg-gray-800 border border-gray-700"
            placeholder="ex: 10"
          />
        </label>

        <label>
          Épaisseur remblais (m)
          <input
            type="number"
            min="0"
            step="any"
            value={epaisseur}
            onInput={e => setEpaisseur(e.target.value)}
            className="mt-1 w-full p-2 rounded bg-gray-800 border border-gray-700"
            placeholder="ex: 0.5"
          />
        </label>
      </div>

      <p className="text-orange-400 font-semibold">
        Volume terrassement/remblais estimé : {volumeTerrassement.toFixed(2)} m³
      </p>

      <div className="flex gap-3 justify-center my-4 flex-wrap">
        <button
          onClick={handleSave}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold shadow"
        >
          💾 Enregistrer
        </button>
        <button
          onClick={clearHistorique}
          className="px-5 py-2 bg-red-600 hover:bg-red-700 rounded-md font-semibold shadow"
        >
          🧹 Effacer l'historique
        </button>
      </div>

      {historique.length > 0 && (
        <section className="max-h-48 overflow-y-auto bg-gray-800 rounded-md p-3 shadow-inner scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-700">
          <h4 className="text-lg font-bold text-orange-400 mb-2 text-center">Historique</h4>
          {historique.map(item => (
            <div
              key={item.id}
              className="bg-gray-700 rounded-md p-2 mb-2 flex justify-between items-center text-sm"
            >
              <div>
                <time className="block text-xs text-gray-400">{item.date}</time>
                <p>Volume : {item.volumeTerrassement} m³</p>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="ml-4 px-2 py-1 bg-red-600 hover:bg-red-700 rounded-md text-white font-semibold"
              >
                ✖
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}


