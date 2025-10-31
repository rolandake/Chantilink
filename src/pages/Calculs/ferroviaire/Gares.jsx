import React from 'react';
import { useState, useEffect } from 'react';

const STORAGE_KEY = "gares-history";

export default function Gares({ currency = "XOF", onMaterialsChange = () => {} }) {
  const [nombreGares, setNombreGares] = useState("");
  const [surfaceMoyenne, setSurfaceMoyenne] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [coutMainOeuvre, setCoutMainOeuvre] = useState("");
  const [historique, setHistorique] = useState([]);

  const surfaceTotale =
    parseFloat(nombreGares) > 0 && parseFloat(surfaceMoyenne) > 0
      ? parseFloat(nombreGares) * parseFloat(surfaceMoyenne)
      : 0;

  const total = surfaceTotale * (parseFloat(prixUnitaire) || 0) + (parseFloat(coutMainOeuvre) || 0);

  useEffect(() => {
    onMaterialsChange({ surfaceTotale });
  }, [surfaceTotale]);

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
    if (surfaceTotale === 0) {
      alert("⚠️ Veuillez entrer des valeurs valides");
      return;
    }
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      nombreGares,
      surfaceMoyenne,
      surfaceTotale: surfaceTotale.toFixed(2),
      prixUnitaire,
      coutMainOeuvre,
      total: total.toFixed(2),
    };
    setHistorique([entry, ...historique]);
    alert("✅ Gares enregistrées !");
  };

  const handleDelete = (id) => {
    if (confirm("🗑️ Supprimer cette entrée ?")) {
      setHistorique(historique.filter((item) => item.id !== id));
    }
  };

  const clearHistorique = () => {
    if (confirm("🧹 Vider tout l'historique ?")) {
      setHistorique([]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h3 className="text-xl font-bold text-orange-400 mb-4">Gares</h3>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: "Nombre de gares", value: nombreGares, setter: setNombreGares },
          { label: "Surface moyenne (m²)", value: surfaceMoyenne, setter: setSurfaceMoyenne },
          { label: `Prix unitaire (${currency}/m²)`, value: prixUnitaire, setter: setPrixUnitaire },
          { label: `Coût main d'œuvre (${currency})`, value: coutMainOeuvre, setter: setCoutMainOeuvre, full: true },
        ].map(({ label, value, setter, full }, idx) => (
          <div className={full ? "col-span-3" : "col-span-1"} key={idx}>
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

      <p>
        📐 Surface totale : <span className="text-orange-400 font-semibold">{surfaceTotale.toFixed(2)} m²</span>
      </p>
      <p className="text-lg font-bold text-orange-400 mt-2">
        💰 Total : {total.toFixed(2)} {currency}
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
          {historique.map((item) => (
            <div
              key={item.id}
              className="bg-gray-700 rounded-md p-2 mb-2 flex justify-between items-center text-sm"
            >
              <div>
                <time className="block text-xs text-gray-400">{item.date}</time>
                <p>Surface totale: {item.surfaceTotale} m²</p>
                <p>Total: {item.total} {currency}</p>
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


