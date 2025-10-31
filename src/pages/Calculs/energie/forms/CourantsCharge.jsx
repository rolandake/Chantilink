import React from 'react';
import { useState, useEffect } from 'react';

const STORAGE_KEY = "courants-charge-history";

export default function CourantsCharge({ onNext = () => {} }) {
  const [puissance, setPuissance] = useState("");
  const [tension, setTension] = useState("");
  const [cosPhi, setCosPhi] = useState("0.9");
  const [type, setType] = useState("monophasé");
  const [historique, setHistorique] = useState([]);

  const intensite = (() => {
    const P = parseFloat(puissance);
    const U = parseFloat(tension);
    const cos = parseFloat(cosPhi);
    if (!P || !U || !cos) return 0;
    return type === "triphasé"
      ? P / (Math.sqrt(3) * U * cos)
      : P / (U * cos);
  })();

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
    if (intensite <= 0) {
      alert("⚠️ Données incomplètes ou invalides.");
      return;
    }
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      puissance,
      tension,
      cosPhi,
      type,
      intensite: intensite.toFixed(2),
    };
    setHistorique([entry, ...historique]);
    alert("✅ Calcul sauvegardé !");
  };

  const clearHistorique = () => {
    if (confirm("🧹 Vider l'historique ?")) {
      setHistorique([]);
    }
  };

  const deleteEntry = (id) => {
    if (confirm("❌ Supprimer cette ligne ?")) {
      setHistorique(historique.filter((e) => e.id !== id));
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-800 rounded-lg shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">
        ⚡ Courants de Charge
      </h2>

      <div className="grid grid-cols-2 gap-5 mb-6">
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Puissance (W)</label>
          <input
            type="number"
            min="0"
            value={puissance}
            onInput={(e) => setPuissance(e.currentTarget.value)}
            className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-orange-400 text-right"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-400">Tension (V)</label>
          <input
            type="number"
            min="0"
            value={tension}
            onInput={(e) => setTension(e.currentTarget.value)}
            className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-orange-400 text-right"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-400">Cos φ</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={cosPhi}
            onInput={(e) => setCosPhi(e.currentTarget.value)}
            className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-orange-400 text-right"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-400">Type de réseau</label>
          <select
            value={type}
            onChange={(e) => setType(e.currentTarget.value)}
            className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-orange-400"
          >
            <option value="monophasé">Monophasé</option>
            <option value="triphasé">Triphasé</option>
          </select>
        </div>
      </div>

      <p className="text-lg font-bold text-orange-400 text-right mb-6">
        Intensité calculée : {intensite.toFixed(2)} A
      </p>

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
                <p>Puissance : {item.puissance} W</p>
                <p>Tension : {item.tension} V</p>
                <p>Cos φ : {item.cosPhi}</p>
                <p>Type : {item.type}</p>
                <p className="font-bold text-orange-300">Intensité : {item.intensite} A</p>
              </div>
              <button
                onClick={() => deleteEntry(item.id)}
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


