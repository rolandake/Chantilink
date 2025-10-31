import React, { useEffect, useState, useRef } from 'react';

const STORAGE_KEY = "toiture-history";
const inputClass = "w-full mb-4 p-2 rounded bg-gray-800 text-white border border-gray-700";

export default function Toiture({
  currency = "XOF",
  onTotalChange = () => {},
  onMaterialsChange = () => {},
}) {
  const [surface, setSurface] = useState("");
  const [typeToiture, setTypeToiture] = useState("tuiles");
  const [epaisseur, setEpaisseur] = useState("0.15");
  const [densiteTuiles, setDensiteTuiles] = useState(12);
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [coutMainOeuvre, setCoutMainOeuvre] = useState("");
  const [historique, setHistorique] = useState([]);

  // ✅ Use refs to avoid infinite loop
  const onTotalChangeRef = useRef(onTotalChange);
  const onMaterialsChangeRef = useRef(onMaterialsChange);

  useEffect(() => {
    onTotalChangeRef.current = onTotalChange;
  }, [onTotalChange]);

  useEffect(() => {
    onMaterialsChangeRef.current = onMaterialsChange;
  }, [onMaterialsChange]);

  const surf = parseFloat(surface) || 0;
  const ep = parseFloat(epaisseur) || 0;
  const densite = parseFloat(densiteTuiles) || 12;
  const pu = parseFloat(prixUnitaire) || 0;
  const mainOeuvre = parseFloat(coutMainOeuvre) || 0;

  // Calculs selon type toiture
  const nbTuiles = (typeToiture === "tuiles" || typeToiture === "tuile_terre_cuite") ? surf * densite : 0;
  const coutMateriauxTuiles = nbTuiles * pu;
  const coutMateriauxBacAcier = typeToiture === "bac_acier" ? surf * pu : 0;

  // Toit terrasse
  const volumeBeton = typeToiture === "toit_terrasse" ? surf * ep : 0;
  const densiteBeton_kg = 2400;
  const doseAcier_kg = 100;
  const doseCiment_kg = 350;
  const densiteSable_kg = 1600;
  const densiteGravier_kg = 1600;
  const volSable_m3 = 0.6;
  const volGravier_m3 = 0.8;

  const sableM3 = volumeBeton * volSable_m3;
  const gravierM3 = volumeBeton * volGravier_m3;

  const betonKg = volumeBeton * densiteBeton_kg;
  const acierKg = volumeBeton * doseAcier_kg;
  const cimentKg = volumeBeton * doseCiment_kg;
  const sableKg = sableM3 * densiteSable_kg;
  const gravierKg = gravierM3 * densiteGravier_kg;

  const betonT = betonKg / 1000;
  const acierT = acierKg / 1000;
  const cimentT = cimentKg / 1000;
  const sableT = sableKg / 1000;
  const gravierT = gravierKg / 1000;

  const totalMateriaux =
    typeToiture === "tuiles" || typeToiture === "tuile_terre_cuite"
      ? coutMateriauxTuiles
      : typeToiture === "bac_acier"
      ? coutMateriauxBacAcier
      : typeToiture === "toit_terrasse"
      ? volumeBeton * pu
      : 0;

  const total = totalMateriaux + mainOeuvre;

  // ✅ FIX: Use refs instead of callbacks in dependencies
  useEffect(() => {
    onTotalChangeRef.current(total);
  }, [total]);

  useEffect(() => {
    onMaterialsChangeRef.current({
      nbTuiles,
      betonM3: volumeBeton,
      betonKg,
      betonT,
      acierKg,
      acierT,
      cimentKg,
      cimentT,
      sableM3,
      sableKg,
      sableT,
      gravierM3,
      gravierKg,
      gravierT,
    });
  }, [
    nbTuiles,
    volumeBeton,
    betonKg,
    betonT,
    acierKg,
    acierT,
    cimentKg,
    cimentT,
    sableM3,
    sableKg,
    sableT,
    gravierM3,
    gravierKg,
    gravierT,
  ]);

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
    if (surf <= 0) {
      alert("⚠️ Veuillez entrer une surface valide.");
      return;
    }
    if (typeToiture === "toit_terrasse" && ep <= 0) {
      alert("⚠️ Veuillez entrer une épaisseur valide pour le toit terrasse.");
      return;
    }
    if ((typeToiture === "tuiles" || typeToiture === "tuile_terre_cuite") && densite <= 0) {
      alert("⚠️ Veuillez entrer une densité valide de tuiles par m².");
      return;
    }

    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      surface: surf.toFixed(2),
      typeToiture,
      epaisseur: ep.toFixed(2),
      densiteTuiles: densite,
      nbTuiles: nbTuiles.toFixed(0),
      volumeBeton: volumeBeton.toFixed(2),
      betonKg: betonKg.toFixed(0),
      betonT: betonT.toFixed(2),
      acierKg: acierKg.toFixed(0),
      acierT: acierT.toFixed(2),
      cimentKg: cimentKg.toFixed(0),
      cimentT: cimentT.toFixed(2),
      sableM3: sableM3.toFixed(2),
      sableKg: sableKg.toFixed(0),
      sableT: sableT.toFixed(2),
      gravierM3: gravierM3.toFixed(2),
      gravierKg: gravierKg.toFixed(0),
      gravierT: gravierT.toFixed(2),
      prixUnitaire: pu.toFixed(2),
      coutMainOeuvre: mainOeuvre.toFixed(2),
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
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">🏠 Toiture</h2>

      <label className="block mb-2 font-semibold text-orange-400">Type de toiture :</label>
      <select
        value={typeToiture}
        onChange={(e) => setTypeToiture(e.target.value)}
        className={inputClass}
      >
        <option value="tuiles">Tuiles classiques</option>
        <option value="bac_acier">Bac acier</option>
        <option value="tuile_terre_cuite">Tuile terre cuite</option>
        <option value="toit_terrasse">Toit terrasse (dalle béton)</option>
        <option value="autre">Autre</option>
      </select>

      <label className="block mb-2 font-semibold text-orange-400">Surface de toiture (m²) :</label>
      <input
        type="number"
        min="0"
        step="any"
        value={surface}
        onChange={(e) => setSurface(e.target.value)}
        placeholder="Ex : 120"
        className={inputClass}
      />

      {(typeToiture === "tuiles" || typeToiture === "tuile_terre_cuite") && (
        <label className="block mb-2 font-semibold text-orange-400">
          Densité tuiles (nombre par m²) :
          <input
            type="number"
            min="1"
            step="1"
            value={densiteTuiles}
            onChange={(e) => setDensiteTuiles(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        </label>
      )}

      {typeToiture === "toit_terrasse" && (
        <>
          <label className="block mb-2 font-semibold text-orange-400">Épaisseur dalle béton (m) :</label>
          <input
            type="number"
            min="0"
            step="any"
            value={epaisseur}
            onChange={(e) => setEpaisseur(e.target.value)}
            placeholder="Ex : 0.15"
            className={inputClass}
          />
        </>
      )}

      <label className="block mb-2 font-semibold text-orange-400">
        Prix unitaire (
        {typeToiture === "tuiles" || typeToiture === "tuile_terre_cuite"
          ? `${currency} par tuile`
          : `${currency} par m²`}
        ) :
      </label>
      <input
        type="number"
        min="0"
        step="any"
        value={prixUnitaire}
        onChange={(e) => setPrixUnitaire(e.target.value)}
        placeholder={`Ex : ${typeToiture === "tuiles" || typeToiture === "tuile_terre_cuite" ? "500" : "15000"}`}
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
        placeholder={`Ex : 50000`}
        className={inputClass}
      />

      {/* Résultats */}
      <div className="mb-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-5 shadow-2xl border-2 border-orange-500/30">
        <h3 className="text-xl font-bold text-orange-400 mb-3">📊 Résultats instantanés</h3>
        <div className="text-sm text-orange-300 space-y-1">
          {typeToiture === "tuiles" || typeToiture === "tuile_terre_cuite" ? (
            <>
              <p>Nombre de tuiles : {nbTuiles.toFixed(0)}</p>
              <p>Coût matériaux estimé : {coutMateriauxTuiles.toLocaleString()} {currency}</p>
            </>
          ) : typeToiture === "bac_acier" ? (
            <p>Coût matériaux estimé : {coutMateriauxBacAcier.toLocaleString()} {currency}</p>
          ) : typeToiture === "toit_terrasse" ? (
            <>
              <p>Volume béton : {volumeBeton.toFixed(2)} m³</p>
              <p>Béton : {betonKg.toFixed(0)} kg — {betonT.toFixed(2)} t</p>
              <p>Acier : {acierKg.toFixed(0)} kg — {acierT.toFixed(2)} t</p>
              <p>Ciment : {cimentKg.toFixed(0)} kg — {cimentT.toFixed(2)} t</p>
              <p>Sable : {sableM3.toFixed(2)} m³ — {sableKg.toFixed(0)} kg — {sableT.toFixed(2)} t</p>
              <p>Gravier : {gravierM3.toFixed(2)} m³ — {gravierKg.toFixed(0)} kg — {gravierT.toFixed(2)} t</p>
            </>
          ) : (
            <p>Calcul non défini pour ce type de toiture.</p>
          )}
        </div>
      </div>

      <div className="text-xl font-bold text-orange-400 text-center mb-6">
        Coût total : {total.toLocaleString()} {currency}
      </div>

      <div className="flex gap-3 justify-center mb-6 flex-wrap">
        <button
          onClick={handleSave}
          disabled={surf === 0}
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
                <p>Surface : {item.surface} m²</p>
                <p>Type toiture : {item.typeToiture}</p>
                {(item.typeToiture === "tuiles" || item.typeToiture === "tuile_terre_cuite") && (
                  <p>Densité tuiles : {item.densiteTuiles} /m²</p>
                )}
                {item.typeToiture === "toit_terrasse" && (
                  <p>Épaisseur dalle : {item.epaisseur} m</p>
                )}
                {(item.typeToiture === "tuiles" || item.typeToiture === "tuile_terre_cuite") && (
                  <p>Nombre tuiles : {item.nbTuiles}</p>
                )}
                {item.typeToiture === "toit_terrasse" && (
                  <>
                    <p>Volume béton : {item.volumeBeton} m³</p>
                    <p>Béton : {item.betonKg} kg — {item.betonT} t</p>
                    <p>Acier : {item.acierKg} kg — {item.acierT} t</p>
                    <p>Ciment : {item.cimentKg} kg — {item.cimentT} t</p>
                    <p>Sable : {item.sableM3} m³ — {item.sableKg} kg — {item.sableT} t</p>
                    <p>Gravier : {item.gravierM3} m³ — {item.gravierKg} kg — {item.gravierT} t</p>
                  </>
                )}
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