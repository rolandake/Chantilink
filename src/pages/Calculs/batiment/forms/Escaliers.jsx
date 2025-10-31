import React, { useState, useEffect } from 'react';

const STORAGE_KEY = "escaliers-history";

export default function Escaliers({ currency = "XOF", onTotalChange = () => {}, onMateriauxChange = () => {} }) {
  const [hauteurTotale, setHauteurTotale] = useState("");
  const [hauteurMarche, setHauteurMarche] = useState("");
  const [profondeurMarche, setProfondeurMarche] = useState("");
  const [largeur, setLargeur] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [coutMainOeuvre, setCoutMainOeuvre] = useState("");
  const [historique, setHistorique] = useState([]);

  // ✅ CALCULS INSTANTANÉS
  const hauteurTotaleNum = parseFloat(hauteurTotale) || 0;
  const hauteurMarcheNum = parseFloat(hauteurMarche) || 0;
  const profondeurMarcheNum = parseFloat(profondeurMarche) || 0;
  const largeurNum = parseFloat(largeur) || 0;
  const prixUnitaireNum = parseFloat(prixUnitaire) || 0;
  const coutMainOeuvreNum = parseFloat(coutMainOeuvre) || 0;

  // Nombre de marches arrondi à l'entier supérieur
  const nombreMarches = hauteurTotaleNum > 0 && hauteurMarcheNum > 0
    ? Math.ceil(hauteurTotaleNum / hauteurMarcheNum)
    : 0;

  // Volume approximé = N marches × profondeur × largeur × hauteur d'une marche
  const volume = nombreMarches > 0 && profondeurMarcheNum > 0 && largeurNum > 0 && hauteurMarcheNum > 0
    ? nombreMarches * profondeurMarcheNum * largeurNum * hauteurMarcheNum
    : 0;

  const total = volume * prixUnitaireNum + coutMainOeuvreNum;

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
  const acierT = volume * 0.05;
  const acierKg = acierT * 1000;

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
      hauteurTotale,
      hauteurMarche,
      profondeurMarche,
      largeur,
      nombreMarches,
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
      total: total.toFixed(2),
    };

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
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">🪜 Escaliers</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { label: "Hauteur totale (m)", value: hauteurTotale, setter: setHauteurTotale },
          { label: "Hauteur marche (m)", value: hauteurMarche, setter: setHauteurMarche },
          { label: "Profondeur marche (m)", value: profondeurMarche, setter: setProfondeurMarche },
          { label: "Largeur escalier (m)", value: largeur, setter: setLargeur },
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
            🔢 Nombre de marches :{" "}
            <span className="text-orange-400 font-semibold">{nombreMarches}</span>
          </p>
          <p>
            📦 Volume estimé :{" "}
            <span className="text-orange-400 font-semibold">{volume.toFixed(3)} m³</span>
          </p>
          <p>
            🧱 Ciment : {cimentKg.toFixed(0)} kg - {cimentT.toFixed(3)} t -{" "}
            {cimentSacs.toFixed(1)} sacs
          </p>
          <p>
            🏖️ Sable : {sableM3.toFixed(2)} m³ - {sableKg.toFixed(0)} kg -{" "}
            {sableT.toFixed(3)} t
          </p>
          <p>
            🪨 Gravier : {gravierM3.toFixed(2)} m³ - {gravierKg.toFixed(0)} kg -{" "}
            {gravierT.toFixed(3)} t
          </p>
          <p>
            💧 Eau : {eauL.toFixed(0)} L - {eauM3.toFixed(2)} m³
          </p>
          <p>
            🔩 Acier : {acierKg.toFixed(0)} kg - {acierT.toFixed(3)} t
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
                <p>Hauteur totale : {item.hauteurTotale} m</p>
                <p>Hauteur marche : {item.hauteurMarche} m</p>
                <p>Profondeur marche : {item.profondeurMarche} m</p>
                <p>Largeur : {item.largeur} m</p>
                <p>Nombre marches : {item.nombreMarches}</p>
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