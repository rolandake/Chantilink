import React from 'react';
import { useEffect, useState } from 'react';

const STORAGE_KEY = "terrassement-history";
const DENSITY_TERRE = 1.7; // t/m³

export default function Terrassement({
  currency = "XOF",
  costValue = 0,
  onCostChange = () => {},
  onSave = () => {},
  onDelete = () => {},
}) {
  const [longueur, setLongueur] = useState("");
  const [largeur, setLargeur] = useState("");
  const [profondeur, setProfondeur] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [coutMainOeuvre, setCoutMainOeuvre] = useState("");
  const [historique, setHistorique] = useState([]);

  const volume =
    parseFloat(longueur) > 0 &&
    parseFloat(largeur) > 0 &&
    parseFloat(profondeur) > 0
      ? parseFloat(longueur) * parseFloat(largeur) * parseFloat(profondeur)
      : 0;

  const poidsTonnes = volume * DENSITY_TERRE;

  const total =
    volume * (parseFloat(prixUnitaire) || 0) + (parseFloat(coutMainOeuvre) || 0);

  useEffect(() => {
    onCostChange(total);
  }, [total]);

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
    if (volume === 0) {
      alert("⚠️ Veuillez entrer des dimensions valides.");
      return;
    }

    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      longueur,
      largeur,
      profondeur,
      volume: volume.toFixed(3),
      poidsTonnes: poidsTonnes.toFixed(2),
      prixUnitaire,
      coutMainOeuvre,
      total: total.toFixed(2),
    };

    setHistorique([entry, ...historique]);
    onSave();
  };

  const handleDelete = (id) => {
    if (confirm("🗑️ Supprimer cette entrée ?")) {
      const updated = historique.filter((item) => item.id !== id);
      setHistorique(updated);
    }
  };

  const clearHistorique = () => {
    if (confirm("🧹 Vider tout l'historique ?")) {
      setHistorique([]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">📏 Terrassement</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {[ 
          { label: "Longueur (m)", value: longueur, setter: setLongueur },
          { label: "Largeur (m)", value: largeur, setter: setLargeur },
          { label: "Profondeur (m)", value: profondeur, setter: setProfondeur },
          { label: `Prix unitaire (${currency}/m³)`, value: prixUnitaire, setter: setPrixUnitaire },
          { label: `Coût main d'œuvre (${currency})`, value: coutMainOeuvre, setter: setCoutMainOeuvre, full: true },
        ].map(({ label, value, setter, full }, idx) => (
          <div className={full ? "col-span-2" : ""} key={idx}>
            <label className="block mb-1 font-semibold text-orange-400">{label}</label>
            <input
              type="number"
              min="0"
              step="any"
              value={value}
              onInput={(e) => setter(e.target.value)}
              className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
              placeholder="0"
            />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 bg-gray-800 rounded-md p-4 mb-6 shadow-inner">
        <div>
          <p>📦 Volume : <span className="text-orange-400 font-semibold">{volume.toFixed(3)} m³</span></p>
          <p>⚖️ Poids estimé : <span className="text-green-400 font-semibold">{poidsTonnes.toFixed(2)} t</span></p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-orange-400">
            💰 Total : {total.toLocaleString()} {currency}
          </p>
        </div>
      </div>

      <div className="flex gap-3 justify-center mb-6 flex-wrap">
        <button
          onClick={handleSave}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold shadow"
        >
          💾 Enregistrer
        </button>
        <button
          onClick={onDelete}
          className="px-5 py-2 bg-red-600 hover:bg-red-700 rounded-md font-semibold shadow"
        >
          ❌ Réinitialiser
        </button>
        <button
          onClick={clearHistorique}
          className="px-5 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md font-semibold shadow"
        >
          🧹 Historique
        </button>
      </div>

      {historique.length > 0 && (
        <section className="max-h-80 overflow-y-auto bg-gray-800 rounded-md p-4 shadow-inner scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-700">
          <h3 className="text-lg font-bold text-orange-400 mb-3 text-center">🕓 Historique</h3>
          {historique.map((item) => (
            <div
              key={item.id}
              className="bg-gray-700 rounded-md p-3 mb-3 flex justify-between items-center text-sm"
            >
              <div className="space-y-1">
                <time className="block text-xs text-gray-400">{item.date}</time>
                <p>Volume : {item.volume} m³</p>
                <p>Poids : {item.poidsTonnes} t</p>
                <p className="font-bold text-orange-300">Total : {item.total} {currency}</p>
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


