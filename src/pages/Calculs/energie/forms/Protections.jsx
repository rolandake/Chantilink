import React from 'react';
import { useState, useEffect } from 'react';

const STORAGE_KEY = "protections-history";

const calibres = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125];

export default function Protections({ onNext = () => {} }) {
  const [courant, setCourant] = useState("");
  const [courbe, setCourbe] = useState("C");
  const [historique, setHistorique] = useState([]);

  const courantNum = parseFloat(courant);
  const calibre = calibres.find((c) => c >= courantNum) || "⚠️";

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
    if (!courant || calibre === "⚠️") {
      alert("⚠️ Veuillez saisir un courant valide.");
      return;
    }

    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      courant,
      courbe,
      calibre,
    };

    setHistorique([entry, ...historique]);
    alert("✅ Calcul sauvegardé !");
  };

  const deleteEntry = (id) => {
    if (confirm("🗑️ Supprimer cette ligne ?")) {
      setHistorique(historique.filter((e) => e.id !== id));
    }
  };

  const clearHistorique = () => {
    if (confirm("🧹 Vider tout l'historique ?")) {
      setHistorique([]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-800 rounded-lg shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">
        ⚡ Protections Électriques
      </h2>

      <div className="grid grid-cols-2 gap-5 mb-6">
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Courant à protéger (A)</label>
          <input
            type="number"
            value={courant}
            onInput={(e) => setCourant(e.currentTarget.value)}
            className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-right"
          />
        </div>
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Courbe de déclenchement</label>
          <select
            value={courbe}
            onChange={(e) => setCourbe(e.currentTarget.value)}
            className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600"
          >
            <option value="B">B - usage domestique</option>
            <option value="C">C - usage général</option>
            <option value="D">D - moteurs / charges inductives</option>
          </select>
        </div>
      </div>

      <div className="bg-gray-700 rounded p-4 mb-6 shadow-inner">
        <p>🔐 Calibre recommandé : <span className="text-green-400 font-bold">{calibre} A</span></p>
        <p className="text-sm text-gray-400">Courbe {courbe} : usage {courbe === "B" ? "domestique" : courbe === "C" ? "standard" : "moteurs"}</p>
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
                <p>Courant : {item.courant} A</p>
                <p>Courbe : {item.courbe}</p>
                <p>Calibre : <span className="text-green-400 font-bold">{item.calibre} A</span></p>
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


