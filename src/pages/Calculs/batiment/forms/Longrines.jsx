import React, { useState, useEffect } from 'react';

const STORAGE_KEY = "longrines-history";

const TYPES_LONGRINES = [
  { value: "filante", label: "Longrine filante", acierCoef: 0.01 },
  { value: "liaison", label: "Longrine de liaison", acierCoef: 0.012 },
  { value: "redressement", label: "Longrine de redressement", acierCoef: 0.013 },
  { value: "prefabriquee", label: "Longrine préfabriquée", acierCoef: 0.008 },
  { value: "coulee", label: "Longrine coulée en place", acierCoef: 0.015 },
  { value: "suspendue", label: "Longrine suspendue", acierCoef: 0.02 },
];

export default function Longrines({
  currency = "XOF",
  onTotalChange = () => {},
  onMateriauxChange = () => {},
}) {
  const [type, setType] = useState("filante");
  const [longueur, setLongueur] = useState("");
  const [largeur, setLargeur] = useState("");
  const [hauteur, setHauteur] = useState("");
  const [prixBeton, setPrixBeton] = useState("");
  const [prixAcier, setPrixAcier] = useState("");
  const [historique, setHistorique] = useState([]);

  // ✅ CALCULS INSTANTANÉS
  const longueurNum = parseFloat(longueur) || 0;
  const largeurNum = parseFloat(largeur) || 0;
  const hauteurNum = parseFloat(hauteur) || 0;
  const prixBetonNum = parseFloat(prixBeton) || 0;
  const prixAcierNum = parseFloat(prixAcier) || 0;

  const volume = longueurNum * largeurNum * hauteurNum;

  const acierCoef = TYPES_LONGRINES.find((t) => t.value === type)?.acierCoef ?? 0.01;

  const acierT = volume * 2400 * acierCoef;
  const acierKg = acierT;

  const coutBeton = volume * prixBetonNum;
  const coutAcier = acierKg * prixAcierNum;
  const total = coutBeton + coutAcier;

  const cimentT = volume * 0.3;
  const cimentKg = cimentT * 1000;
  const cimentSacs = cimentKg / 50;

  const sableT = volume * 0.6;
  const sableKg = sableT * 1000;
  const sableM3 = sableKg / 1600;

  const gravierT = volume * 0.8;
  const gravierKg = gravierT * 1000;
  const gravierM3 = gravierKg / 1700;

  const eauL = volume * 150;
  const eauM3 = eauL / 1000;

  useEffect(() => {
    onTotalChange(total);
  }, [total, onTotalChange]);

  useEffect(() => {
    onMateriauxChange({
      Ciment: cimentT,
      Sable: sableT,
      Gravier: gravierT,
      Eau: eauL,
      Acier: acierT,
    });
  }, [cimentT, sableT, gravierT, eauL, acierT, onMateriauxChange]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistorique(JSON.parse(saved));
      } catch (e) {
        console.error("Erreur parsing historique :", e);
      }
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
      type,
      longueur,
      largeur,
      hauteur,
      volume: volume.toFixed(3),
      cimentT: cimentT.toFixed(3),
      cimentKg: cimentKg.toFixed(0),
      cimentSacs: cimentSacs.toFixed(1),
      sableT: sableT.toFixed(3),
      sableKg: sableKg.toFixed(0),
      sableM3: sableM3.toFixed(2),
      gravierT: gravierT.toFixed(3),
      gravierKg: gravierKg.toFixed(0),
      gravierM3: gravierM3.toFixed(2),
      eauL: eauL.toFixed(0),
      eauM3: eauM3.toFixed(2),
      acierT: acierT.toFixed(3),
      acierKg: acierKg.toFixed(0),
      prixBeton,
      prixAcier,
      total: total.toFixed(2),
    };

    console.log("Enregistrement entrée:", entry);
    setHistorique((prev) => [entry, ...prev]);
    alert("✅ Calcul sauvegardé !");
  };

  const handleDelete = (id) => {
    if (confirm("🗑️ Supprimer cette entrée ?")) {
      setHistorique((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const clearHistorique = () => {
    if (confirm("🧹 Vider tout l'historique ?")) {
      setHistorique([]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">🏗️ Longrines</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Type de longrine</label>
          <select
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {TYPES_LONGRINES.map(({ value, label }) => (
              <option value={value} key={value}>{label}</option>
            ))}
          </select>
        </div>

        {[
          { label: "Longueur (m)", value: longueur, setter: setLongueur },
          { label: "Largeur (m)", value: largeur, setter: setLargeur },
          { label: "Hauteur (m)", value: hauteur, setter: setHauteur },
          {
            label: `Prix béton (${currency}/m³)`,
            value: prixBeton,
            setter: setPrixBeton,
          },
          {
            label: `Prix acier (${currency}/kg)`,
            value: prixAcier,
            setter: setPrixAcier,
          },
        ].map(({ label, value, setter }, idx) => (
          <div key={idx}>
            <label className="block mb-1 font-semibold text-orange-400">{label}</label>
            <input
              type="number"
              min="0"
              step="any"
              value={value}
              onChange={(e) => setter(e.target.value)}
              className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
              placeholder="0"
            />
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 mb-6 shadow-2xl border-2 border-orange-500/30">
        <h3 className="text-xl font-bold text-orange-400 mb-3">📊 Résultats instantanés</h3>
        <div className="space-y-2">
          <p>
            📦 Volume béton :{" "}
            <span className="text-orange-400 font-semibold">{volume.toFixed(3)} m³</span>
          </p>
          <p>
            🧱 Ciment : {cimentKg.toFixed(0)} kg - {cimentT.toFixed(3)} t - {cimentSacs.toFixed(1)} sacs
          </p>
          <p>
            🏖️ Sable : {sableM3.toFixed(2)} m³ - {sableKg.toFixed(0)} kg - {sableT.toFixed(3)} t
          </p>
          <p>
            🪨 Gravier : {gravierM3.toFixed(2)} m³ - {gravierKg.toFixed(0)} kg - {gravierT.toFixed(3)} t
          </p>
          <p>
            💧 Eau : {eauL.toFixed(0)} L - {eauM3.toFixed(2)} m³
          </p>
          <p>
            🔩 Acier estimé : {acierKg.toFixed(0)} kg - {acierT.toFixed(3)} t
          </p>
          <p className="text-lg font-bold text-orange-400 mt-3">
            💰 Total : {total.toLocaleString()} {currency}
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
        <section className="max-h-80 overflow-y-auto bg-gray-800 rounded-md p-4 shadow-inner scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-700">
          <h3 className="text-lg font-bold text-orange-400 mb-3 text-center">🕓 Historique</h3>
          {historique.map((item) => (
            <div
              key={item.id}
              className="bg-gray-700 rounded-md p-3 mb-3 flex justify-between items-center text-sm"
            >
              <div className="space-y-1">
                <time className="block text-xs text-gray-400">{item.date}</time>
                <p>Type : {item.type}</p>
                <p>Longueur : {item.longueur} m</p>
                <p>Largeur : {item.largeur} m</p>
                <p>Hauteur : {item.hauteur} m</p>
                <p>Volume : {item.volume} m³</p>
                <p>
                  Ciment : {item.cimentKg} kg - {item.cimentT} t - {item.cimentSacs} sacs
                </p>
                <p>
                  Sable : {item.sableM3} m³ - {item.sableKg} kg - {item.sableT} t
                </p>
                <p>
                  Gravier : {item.gravierM3} m³ - {item.gravierKg} kg - {item.gravierT} t
                </p>
                <p>
                  Eau : {item.eauL} L - {item.eauM3} m³
                </p>
                <p>
                  Acier : {item.acierKg} kg - {item.acierT} t
                </p>
                <p className="font-bold text-orange-300">
                  Total : {item.total} {currency}
                </p>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="ml-4 px-2 py-1 bg-red-600 hover:bg-red-700 rounded-md text-white font-semibold"
                aria-label="Supprimer l'entrée"
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