// ============ LINTEAUX.JSX ============
import React, { useState, useEffect } from 'react';

const STORAGE_KEY_LINTEAUX = "linteaux-history";

export function Linteaux({ currency = "XOF", onTotalChange = () => {} }) {
  const [surface, setSurface] = useState("");
  const [epaisseur, setEpaisseur] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [coutMainOeuvre, setCoutMainOeuvre] = useState("");
  const [historique, setHistorique] = useState([]);

  // ✅ CALCULS INSTANTANÉS
  const surfaceNum = parseFloat(surface) || 0;
  const epaisseurNum = parseFloat(epaisseur) || 0;
  const prixUnitaireNum = parseFloat(prixUnitaire) || 0;
  const coutMainOeuvreNum = parseFloat(coutMainOeuvre) || 0;

  const volume = surfaceNum * epaisseurNum;

  const cimentT = volume * 0.3;
  const sableT = volume * 0.6;
  const gravierT = volume * 0.8;
  const eauL = volume * 150;
  const acierT = volume * 0.05;
  const acierKg = acierT * 1000;

  const total = surfaceNum * prixUnitaireNum + coutMainOeuvreNum;

  useEffect(() => {
    onTotalChange(total);
  }, [total, onTotalChange]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LINTEAUX);
    if (saved) {
      try {
        setHistorique(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LINTEAUX, JSON.stringify(historique));
  }, [historique]);

  const handleSave = () => {
    if (surfaceNum <= 0 || epaisseurNum <= 0) {
      alert("⚠️ Veuillez entrer des valeurs valides pour surface et épaisseur.");
      return;
    }
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      surface: surfaceNum.toFixed(2),
      epaisseur: epaisseurNum.toFixed(3),
      prixUnitaire: prixUnitaireNum.toFixed(2),
      coutMainOeuvre: coutMainOeuvreNum.toFixed(2),
      volume: volume.toFixed(3),
      cimentT: cimentT.toFixed(3),
      sableT: sableT.toFixed(3),
      gravierT: gravierT.toFixed(3),
      eauL: eauL.toFixed(0),
      acierT: acierT.toFixed(3),
      acierKg: acierKg.toFixed(0),
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
    <div className="max-w-3xl mx-auto p-4 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h3 className="text-xl font-bold text-orange-400 mb-4 text-center">Linteaux</h3>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Surface (m²)</label>
          <input
            type="number"
            min="0"
            step="any"
            value={surface}
            onChange={(e) => setSurface(e.target.value)}
            placeholder="ex: 20"
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-400">Épaisseur (m)</label>
          <input
            type="number"
            min="0"
            step="any"
            value={epaisseur}
            onChange={(e) => setEpaisseur(e.target.value)}
            placeholder="ex: 0.2"
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-400">
            Prix unitaire ({currency}/m²)
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={prixUnitaire}
            onChange={(e) => setPrixUnitaire(e.target.value)}
            placeholder="ex: 18000"
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div className="col-span-2">
          <label className="block mb-1 font-semibold text-orange-400">
            Coût main d'œuvre ({currency})
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={coutMainOeuvre}
            onChange={(e) => setCoutMainOeuvre(e.target.value)}
            placeholder="ex: 35000"
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 mb-6 shadow-2xl border-2 border-orange-500/30">
        <h3 className="text-xl font-bold text-orange-400 mb-3">📊 Résultats instantanés</h3>
        <div className="space-y-2">
          <p>📦 Volume béton estimé : <span className="text-orange-400 font-semibold">{volume.toFixed(3)} m³</span></p>
          <p>🧱 Ciment : {cimentT.toFixed(3)} t</p>
          <p>🏖️ Sable : {sableT.toFixed(3)} t</p>
          <p>🪨 Gravier : {gravierT.toFixed(3)} t</p>
          <p>💧 Eau : {eauL.toFixed(0)} L</p>
          <p>🔩 Acier : {acierKg.toFixed(0)} kg ({acierT.toFixed(3)} t)</p>
          <p className="text-lg font-bold text-orange-400 mt-3">
            Total estimé : {total.toLocaleString()} {currency}
          </p>
        </div>
      </div>

      <div className="flex gap-3 justify-center mb-6 flex-wrap">
        <button
          onClick={handleSave}
          disabled={volume === 0}
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
        <section className="max-h-60 overflow-y-auto bg-gray-800 rounded-md p-4 shadow-inner scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-700">
          <h4 className="text-lg font-bold text-orange-400 mb-3 text-center">Historique</h4>
          {historique.map((item) => (
            <div
              key={item.id}
              className="bg-gray-700 rounded-md p-3 mb-3 flex justify-between items-center text-sm"
            >
              <div>
                <time className="block text-xs text-gray-400">{item.date}</time>
                <p>Surface : {item.surface} m²</p>
                <p>Épaisseur : {item.epaisseur} m</p>
                <p>Volume : {item.volume} m³</p>
                <p>Ciment : {item.cimentT} t</p>
                <p>Sable : {item.sableT} t</p>
                <p>Gravier : {item.gravierT} t</p>
                <p>Eau : {item.eauL} L</p>
                <p>Acier : {item.acierKg} kg ({item.acierT} t)</p>
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

export default Linteaux;