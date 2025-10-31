import React from 'react';
import { useState, useEffect } from 'react';

const STORAGE_KEY = "planchers-history";

const RATIO = {
  cimentKg: 350,
  sableM3: 0.5,
  gravierM3: 0.9,
  eauL: 180,
  acierKg: 60, // Ajout ratio acier en kg par m³ (typique pour plancher)
};

export default function Planchers({
  currency = "XOF",
  onTotalChange = () => {},
  onMateriauxChange = () => {},
}) {
  const [surface, setSurface] = useState("");
  const [epaisseur, setEpaisseur] = useState("0.15");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [coutMainOeuvre, setCoutMainOeuvre] = useState("");
  const [historique, setHistorique] = useState([]);

  const volume = (parseFloat(surface) || 0) * (parseFloat(epaisseur) || 0);

  const cimentKg = volume * RATIO.cimentKg;
  const cimentT = cimentKg / 1000;
  const cimentSacs = cimentKg / 50;

  const sableM3 = volume * RATIO.sableM3;
  const sableKg = sableM3 * 1600;
  const sableT = sableKg / 1000;

  const gravierM3 = volume * RATIO.gravierM3;
  const gravierKg = gravierM3 * 1700;
  const gravierT = gravierKg / 1000;

  const eauL = volume * RATIO.eauL;
  const eauM3 = eauL / 1000;

  const acierKg = volume * RATIO.acierKg;
  const acierT = acierKg / 1000;

  const total =
    volume * (parseFloat(prixUnitaire) || 0) + (parseFloat(coutMainOeuvre) || 0);

  useEffect(() => {
    onTotalChange(total);
    onMateriauxChange({
      ciment: cimentT,
      sable: sableT,
      gravier: gravierT,
      eau: eauL,
      acier: acierT,
    });
  }, [total, cimentT, sableT, gravierT, eauL, acierT]);

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
    if (volume <= 0) {
      alert("⚠️ Veuillez entrer une surface et une épaisseur valides.");
      return;
    }
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      surface,
      epaisseur,
      volume: volume.toFixed(2),
      cimentKg: cimentKg.toFixed(0),
      cimentT: cimentT.toFixed(3),
      cimentSacs: cimentSacs.toFixed(1),
      sableM3: sableM3.toFixed(2),
      sableKg: sableKg.toFixed(0),
      sableT: sableT.toFixed(3),
      gravierM3: gravierM3.toFixed(2),
      gravierKg: gravierKg.toFixed(0),
      gravierT: gravierT.toFixed(3),
      eauL: eauL.toFixed(0),
      eauM3: eauM3.toFixed(3),
      acierKg: acierKg.toFixed(0),
      acierT: acierT.toFixed(3),
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
    <div className="max-w-4xl mx-auto p-4 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h3 className="text-xl font-bold text-orange-400 mb-4 text-center">Planchers</h3>

      <div className="grid grid-cols-2 gap-4 mb-2">
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Surface (m²)</label>
          <input
            type="number"
            min="0"
            step="any"
            value={surface}
            onInput={(e) => setSurface(e.target.value)}
            placeholder="ex: 100"
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
            onInput={(e) => setEpaisseur(e.target.value)}
            placeholder="ex: 0.15"
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-400">Prix unitaire ({currency}/m³)</label>
          <input
            type="number"
            min="0"
            step="any"
            value={prixUnitaire}
            onInput={(e) => setPrixUnitaire(e.target.value)}
            placeholder="ex: 45000"
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-400">Coût main d'œuvre ({currency})</label>
          <input
            type="number"
            min="0"
            step="any"
            value={coutMainOeuvre}
            onInput={(e) => setCoutMainOeuvre(e.target.value)}
            placeholder="ex: 75000"
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      <div className="mt-6 mb-8 text-sm bg-gray-800 p-4 rounded-lg shadow-inner w-full md:w-1/2">
        <p className="text-md font-bold text-orange-400 mb-2">🔍 Résultats</p>
        <p>
          Volume : <span className="text-orange-300">{volume.toFixed(2)} m³</span>
        </p>
        <p>
          Ciment : {cimentKg.toFixed(0)} kg — {cimentT.toFixed(3)} t — {cimentSacs.toFixed(1)} sacs
        </p>
        <p>
          Sable : {sableM3.toFixed(2)} m³ — {sableKg.toFixed(0)} kg — {sableT.toFixed(3)} t
        </p>
        <p>
          Gravier : {gravierM3.toFixed(2)} m³ — {gravierKg.toFixed(0)} kg — {gravierT.toFixed(3)} t
        </p>
        <p>
          Eau : {eauL.toFixed(0)} L — {eauM3.toFixed(3)} m³
        </p>
        <p>
          Acier : {acierKg.toFixed(0)} kg — {acierT.toFixed(3)} t
        </p>
        <p className="text-lg font-bold text-green-400 mt-3">
          Total estimé : {total.toLocaleString()} {currency}
        </p>
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
                <p>
                  Ciment : {item.cimentKg} kg — {item.cimentT} t — {item.cimentSacs} sacs
                </p>
                <p>
                  Sable : {item.sableM3} m³ — {(item.sableM3 * 1600).toFixed(0)} kg — {(item.sableM3 * 1.6).toFixed(3)} t
                </p>
                <p>
                  Gravier : {item.gravierM3} m³ — {(item.gravierM3 * 1700).toFixed(0)} kg — {(item.gravierM3 * 1.7).toFixed(3)} t
                </p>
                <p>
                  Eau : {item.eauL} L — {(item.eauL / 1000).toFixed(3)} m³
                </p>
                <p>
                  Acier : {item.acierKg} kg — {item.acierT} t
                </p>
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


