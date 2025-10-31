import React from 'react';
import { useState, useEffect } from 'react';

const STORAGE_KEY = "pertes-electriques-history";
const RESISTIVITE_CUIVRE = 0.0175; // Ω·mm²/m

export default function PertesElectriques({ onNext = () => {} }) {
  const [longueur, setLongueur] = useState("");
  const [section, setSection] = useState("");
  const [courant, setCourant] = useState("");
  const [historique, setHistorique] = useState([]);

  const L = parseFloat(longueur) * 2; // Aller-retour
  const S = parseFloat(section);
  const I = parseFloat(courant);

  const resistance = L > 0 && S > 0 ? (RESISTIVITE_CUIVRE * L) / S : 0;
  const pertes = I > 0 ? resistance * Math.pow(I, 2) : 0;

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
    if (!L || !S || !I) {
      alert("⚠️ Remplir tous les champs correctement.");
      return;
    }

    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      longueur,
      section,
      courant,
      resistance: resistance.toFixed(4),
      pertes: pertes.toFixed(2),
    };

    setHistorique([entry, ...historique]);
    alert("✅ Calcul sauvegardé !");
  };

  const handleDelete = (id) => {
    if (confirm("🗑️ Supprimer cette ligne ?")) {
      setHistorique(historique.filter((e) => e.id !== id));
    }
  };

  const clearHistorique = () => {
    if (confirm("🧹 Vider l'historique ?")) {
      setHistorique([]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-800 rounded-lg shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">
        🔥 Pertes Électriques (Effet Joule)
      </h2>

      <div className="grid grid-cols-2 gap-5 mb-6">
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Longueur (m)</label>
          <input
            type="number"
            min="0"
            value={longueur}
            onInput={(e) => setLongueur(e.currentTarget.value)}
            className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600"
          />
        </div>
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Section câble (mm²)</label>
          <input
            type="number"
            min="0"
            value={section}
            onInput={(e) => setSection(e.currentTarget.value)}
            className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600"
          />
        </div>
        <div className="col-span-2">
          <label className="block mb-1 font-semibold text-orange-400">Courant (A)</label>
          <input
            type="number"
            min="0"
            value={courant}
            onInput={(e) => setCourant(e.currentTarget.value)}
            className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600"
          />
        </div>
      </div>

      <div className="bg-gray-700 rounded p-4 mb-6 shadow-inner">
        <p>🧮 Résistance : <span className="text-green-400 font-bold">{resistance.toFixed(4)} Ω</span></p>
        <p>🔥 Pertes (effet Joule) : <span className="text-orange-400 font-bold">{pertes.toFixed(2)} W</span></p>
      </div>

      <div className="flex gap-3 justify-between flex-wrap mb-6">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold shadow"
        >
          💾 Enregistrer
        </button>
        <button
          onClick={clearHistorique}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded font-semibold shadow"
        >
          🧹 Vider
        </button>
        <button
          onClick={onNext}
          className="ml-auto px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded font-semibold shadow"
        >
          ▶️ Suivant
        </button>
      </div>

      {historique.length > 0 && (
        <section className="max-h-72 overflow-y-auto bg-gray-700 rounded-md p-4 shadow-inner scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-600">
          <h3 className="text-orange-400 font-bold mb-3 text-center">🕓 Historique</h3>
          {historique.map((item) => (
            <div
              key={item.id}
              className="bg-gray-800 rounded-md p-3 mb-3 text-sm flex justify-between"
            >
              <div>
                <time className="text-xs block text-gray-400 mb-1">{item.date}</time>
                <p>Longueur : {item.longueur} m</p>
                <p>Section : {item.section} mm²</p>
                <p>Courant : {item.courant} A</p>
                <p className="font-bold text-orange-400">Pertes : {item.pertes} W</p>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="h-8 px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded"
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


