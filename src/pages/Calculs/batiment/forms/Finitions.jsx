// ============ FINITIONS.JSX ============
import React, { useState, useEffect, useRef } from 'react';

const STORAGE_KEY_FINITIONS = "finition-history";
const inputClass = "w-full mb-4 p-2 rounded bg-gray-800 text-white border border-gray-700";

export default function Finitions({ currency = "XOF", onTotalChange = () => {} }) {
  const [surface, setSurface] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [typeFinition, setTypeFinition] = useState("peinture");
  const [coutMainOeuvre, setCoutMainOeuvre] = useState("");
  const [historique, setHistorique] = useState([]);

  // ✅ Use ref to avoid infinite loop
  const onTotalChangeRef = useRef(onTotalChange);

  useEffect(() => {
    onTotalChangeRef.current = onTotalChange;
  }, [onTotalChange]);

  // ✅ CALCULS INSTANTANÉS
  const surf = parseFloat(surface) || 0;
  const pu = parseFloat(prixUnitaire) || 0;
  const mainOeuvre = parseFloat(coutMainOeuvre) || 0;

  const total = surf * pu + mainOeuvre;

  // Estimations matériaux par type de finition
  const details = {
    peinture: {
      litres: (surf / 10).toFixed(1),
    },
    carrelage: {
      m2: (surf * 1.1).toFixed(2), // 10% de perte
    },
    parquet: {
      m2: (surf * 1.05).toFixed(2), // 5% de perte
    },
    platre: {
      sacs: (surf / 5).toFixed(1), // 1 sac de 25kg pour 5 m²
    },
  };

  useEffect(() => {
    onTotalChangeRef.current(total);
  }, [total]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_FINITIONS);
    if (saved) {
      try {
        setHistorique(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FINITIONS, JSON.stringify(historique));
  }, [historique]);

  const handleSave = () => {
    if (surf <= 0) return alert("⚠️ Veuillez entrer une surface valide.");
    if (pu <= 0) return alert("⚠️ Veuillez entrer un prix unitaire valide.");

    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      surface: surf.toFixed(2),
      prixUnitaire: pu.toFixed(2),
      typeFinition,
      coutMainOeuvre: mainOeuvre.toFixed(2),
      total: total.toFixed(2),
      materiaux: details[typeFinition] || {},
    };

    setHistorique([entry, ...historique]);
    alert("✅ Calcul sauvegardé !");
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
    <div className="max-w-3xl mx-auto p-4 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">🎨 Finitions</h2>

      <label className="block mb-2 font-semibold text-orange-400">Type de finition :</label>
      <select
        value={typeFinition}
        onChange={(e) => setTypeFinition(e.target.value)}
        className={inputClass}
      >
        <option value="peinture">Peinture</option>
        <option value="carrelage">Carrelage</option>
        <option value="parquet">Parquet</option>
        <option value="platre">Plâtre</option>
        <option value="autre">Autre</option>
      </select>

      <label className="block mb-2 font-semibold text-orange-400">Surface à finir (m²) :</label>
      <input
        type="number"
        min="0"
        step="any"
        value={surface}
        onChange={(e) => setSurface(e.target.value)}
        placeholder="Ex : 150"
        className={inputClass}
      />

      <label className="block mb-2 font-semibold text-orange-400">
        Prix unitaire ({currency}) :
      </label>
      <input
        type="number"
        min="0"
        step="any"
        value={prixUnitaire}
        onChange={(e) => setPrixUnitaire(e.target.value)}
        placeholder={`Ex : 12000 (${currency} par m²)`}
        className={inputClass}
      />

      <label className="block mb-4 font-semibold text-orange-400">
        Coût main d'œuvre ({currency}) :
      </label>
      <input
        type="number"
        min="0"
        step="any"
        value={coutMainOeuvre}
        onChange={(e) => setCoutMainOeuvre(e.target.value)}
        placeholder={`Ex : 50000 (${currency})`}
        className={inputClass}
      />

      {typeFinition !== "autre" && surf > 0 && (
        <div className="mb-4 bg-gray-800 p-3 rounded text-sm space-y-1">
          <p className="text-orange-300 font-semibold">🔍 Estimation matériaux :</p>
          {typeFinition === "peinture" && <p>Peinture : {details.peinture.litres} L</p>}
          {typeFinition === "carrelage" && <p>Carrelage : {details.carrelage.m2} m² (avec marge)</p>}
          {typeFinition === "parquet" && <p>Parquet : {details.parquet.m2} m² (avec marge)</p>}
          {typeFinition === "platre" && <p>Plâtre : {details.platre.sacs} sacs (25 kg)</p>}
        </div>
      )}

      <div className="text-xl font-bold text-orange-400 text-center mb-6">
        Coût total : {total.toLocaleString()} {currency}
      </div>

      <div className="flex gap-3 justify-center mb-6 flex-wrap">
        <button
          onClick={handleSave}
          disabled={surf === 0 || pu === 0}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-md font-semibold shadow"
        >
          💾 Enregistrer
        </button>
        <button
          onClick={clearHistorique}
          disabled={historique.length === 0}
          className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-md font-semibold shadow"
        >
          🧹 Effacer l'historique
        </button>
      </div>

      {historique.length > 0 && (
        <section
          className="max-h-80 overflow-y-auto bg-gray-800 rounded-md p-4 shadow-inner scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-700"
        >
          <h3 className="text-lg font-bold text-orange-400 mb-3 text-center">🕓 Historique</h3>
          {historique.map((item) => (
            <div
              key={item.id}
              className="bg-gray-700 rounded-md p-3 mb-3 flex justify-between items-center text-sm"
            >
              <div className="space-y-1">
                <time className="block text-xs text-gray-400">{item.date}</time>
                <p>Finition : {item.typeFinition}</p>
                <p>Surface : {item.surface} m²</p>
                {item.materiaux && Object.entries(item.materiaux).map(([k, v]) => (
                  <p key={k}>{k} : {v}</p>
                ))}
                <p className="font-bold text-orange-300">
                  Total : {item.total} {currency}
                </p>
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