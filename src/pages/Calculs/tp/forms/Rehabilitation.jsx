import React, { useState, useEffect } from 'react';

const STORAGE_KEY = "rehabilitation-history";

export default function Rehabilitation({ currency = "XOF" }) {
  const [details, setDetails] = useState("");
  const [cout, setCout] = useState("");
  const [historique, setHistorique] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistorique(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const handleSave = () => {
    if (!details || !cout) {
      alert("⚠️ Veuillez remplir les champs.");
      return;
    }

    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      details,
      cout: parseFloat(cout).toFixed(2),
    };

    const updated = [entry, ...historique];
    setHistorique(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    alert("✅ Enregistré dans l'historique !");
  };

  const handleDelete = (id) => {
    if (confirm("🗑️ Supprimer cette entrée ?")) {
      const updated = historique.filter((item) => item.id !== id);
      setHistorique(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };

  const clearHistorique = () => {
    if (confirm("🧹 Vider tout l'historique ?")) {
      setHistorique([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-xl shadow-lg text-gray-100 font-sans space-y-6">
      <h2 className="text-2xl font-bold text-orange-400 text-center">🏗️ Travaux de Réhabilitation</h2>

      <div>
        <label className="block mb-2 font-semibold text-orange-400">Description des travaux</label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Décris les éléments de réhabilitation ici..."
          className="w-full h-32 p-3 rounded-md bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400 transition"
        />
      </div>

      <div>
        <label className="block mb-2 font-semibold text-orange-400">
          Coût total estimé ({currency})
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={cout}
          onChange={(e) => setCout(e.target.value)}
          placeholder={`Ex : 150000 ${currency}`}
          className="w-full p-3 rounded-md bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400 transition"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handleSave}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold shadow transition"
        >
          💾 Enregistrer
        </button>
        <button
          onClick={clearHistorique}
          className="px-5 py-2 bg-red-600 hover:bg-red-700 rounded-md font-semibold shadow transition"
        >
          🧹 Effacer l'historique
        </button>
      </div>

      {historique.length > 0 && (
        <section className="max-h-80 overflow-y-auto bg-gray-800 rounded-lg p-4 shadow-inner scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-700">
          <h3 className="text-lg font-bold text-orange-400 mb-3 text-center">🕓 Historique</h3>
          {historique.map((item) => (
            <div
              key={item.id}
              className="bg-gray-700 rounded-lg p-3 mb-3 flex justify-between items-start text-sm"
            >
              <div className="space-y-1 max-w-[85%]">
                <time className="block text-xs text-gray-400">{item.date}</time>
                <p className="text-orange-300 font-semibold">Coût : {item.cout} {currency}</p>
                <p className="text-white italic">{item.details}</p>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md text-white font-bold text-xs transition"
                aria-label="Supprimer entrée"
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
