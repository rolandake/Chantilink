import React from 'react';
import { useState, useEffect } from 'react';

const STORAGE_KEY = "capacite-equipements-history";

export default function CapaciteEquipements({ onNext = () => {} }) {
  const [puissanceTotale, setPuissanceTotale] = useState("");
  const [coeffSecurite, setCoeffSecurite] = useState("1.25");
  const [historique, setHistorique] = useState([]);

  const P = parseFloat(puissanceTotale);
  const K = parseFloat(coeffSecurite);

  const capaciteKVA = P > 0 && K > 0 ? P * K : 0;

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
    if (!P || !K) {
      alert("⚠️ Remplir tous les champs.");
      return;
    }

    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      puissance: P.toFixed(2),
      coefficient: K.toFixed(2),
      capacite: capaciteKVA.toFixed(2),
    };

    setHistorique([entry, ...historique]);
    alert("✅ Sauvegardé !");
  };

  const handleDelete = (id) => {
    if (confirm("🗑️ Supprimer ?")) {
      setHistorique(historique.filter((e) => e.id !== id));
    }
  };

  const clearHistorique = () => {
    if (confirm("🧹 Vider l'historique ?")) {
      setHistorique([]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-800 rounded-lg shadow-lg text-gray-100">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">🧮 Capacité des Équipements</h2>

      <div className="grid grid-cols-2 gap-5 mb-6">
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Puissance totale (kW)</label>
          <input
            type="number"
            min="0"
            value={puissanceTotale}
            onInput={(e) => setPuissanceTotale(e.currentTarget.value)}
            className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600"
          />
        </div>
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Coefficient de sécurité</label>
          <input
            type="number"
            step="0.01"
            min="1"
            value={coeffSecurite}
            onInput={(e) => setCoeffSecurite(e.currentTarget.value)}
            className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600"
          />
        </div>
      </div>

      <div className="bg-gray-700 p-4 rounded shadow-inner mb-6 text-lg">
        ⚡ Capacité requise :{" "}
        <span className="text-green-400 font-bold">{capaciteKVA.toFixed(2)} kVA</span>
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
          🧹 Effacer
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
                <p>Puissance : {item.puissance} kW</p>
                <p>Coefficient : {item.coefficient}</p>
                <p className="font-bold text-orange-400">Capacité : {item.capacite} kVA</p>
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


