import React from 'react';
// src/pages/Calculs/eco/forms/FondationEco.jsx
import { useEffect, useState } from 'react';

const STORAGE_KEY = "fondationeco-history";

export default function FondationEco({ currency = "XOF", onTotalChange = () => {}, onMaterialsChange = () => {} }) {
  const [longueur, setLongueur] = useState("");
  const [largeur, setLargeur] = useState("");
  const [hauteur, setHauteur] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [coutMainOeuvre, setCoutMainOeuvre] = useState("");
  const [historique, setHistorique] = useState([]);

  const volume =
    parseFloat(longueur) > 0 &&
    parseFloat(largeur) > 0 &&
    parseFloat(hauteur) > 0
      ? parseFloat(longueur) * parseFloat(largeur) * parseFloat(hauteur)
      : 0;

  // Exemple d'estimation des matériaux éco (ex : ciment éco, sable recyclé, etc.)
  const cimentEcoKg = volume * 300; // un peu moins que le classique
  const sableEcoM3 = volume * 0.4;
  const gravierEcoM3 = volume * 0.8;
  const eauL = volume * 170;

  const total =
    volume * (parseFloat(prixUnitaire) || 0) + (parseFloat(coutMainOeuvre) || 0);

  useEffect(() => {
    onTotalChange(total);
    onMaterialsChange({
      cimentEcoKg,
      sableEcoM3,
      gravierEcoM3,
      eauL,
    });
  }, [total, cimentEcoKg, sableEcoM3, gravierEcoM3, eauL]);

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
      alert("⚠️ Veuillez saisir des dimensions valides.");
      return;
    }
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      longueur,
      largeur,
      hauteur,
      volume: volume.toFixed(2),
      cimentEcoKg: cimentEcoKg.toFixed(0),
      sableEcoM3: sableEcoM3.toFixed(2),
      gravierEcoM3: gravierEcoM3.toFixed(2),
      eauL: eauL.toFixed(0),
      prixUnitaire,
      coutMainOeuvre,
      total: total.toFixed(2),
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
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">🏗️ Fondation Écologique</h2>

      <div className="grid grid-cols-2 gap-5 mb-6">
        {[ 
          { label: "Longueur (m)", value: longueur, setter: setLongueur },
          { label: "Largeur (m)", value: largeur, setter: setLargeur },
          { label: "Hauteur (m)", value: hauteur, setter: setHauteur },
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
          <p>📦 Volume : <span className="text-orange-400 font-semibold">{volume.toFixed(2)} m³</span></p>
          <p>🧱 Ciment écologique : {cimentEcoKg.toFixed(0)} kg</p>
          <p>🏖️ Sable recyclé : {sableEcoM3.toFixed(2)} m³</p>
          <p>🪨 Gravier recyclé : {gravierEcoM3.toFixed(2)} m³</p>
          <p>💧 Eau : {eauL.toFixed(0)} L</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-orange-400">💰 Total : {total.toLocaleString()} {currency}</p>
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
          onClick={clearHistorique}
          className="px-5 py-2 bg-red-600 hover:bg-red-700 rounded-md font-semibold shadow"
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
                <p>Volume : {item.volume} m³</p>
                <p>Ciment écologique : {item.cimentEcoKg} kg</p>
                <p>Sable recyclé : {item.sableEcoM3} m³</p>
                <p>Gravier recyclé : {item.gravierEcoM3} m³</p>
                <p>Eau : {item.eauL} L</p>
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


