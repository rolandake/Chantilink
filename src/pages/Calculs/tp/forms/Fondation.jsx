import React, { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "fondation-history";

function formatNumber(value, decimals = 2) {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function Fondation({ currency = "XOF", onTotalChange = () => {}, onMateriauxChange = () => {} }) {
  const [longueur, setLongueur] = useState("");
  const [largeur, setLargeur] = useState("");
  const [profondeur, setProfondeur] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [coutMainOeuvre, setCoutMainOeuvre] = useState("");
  const [historique, setHistorique] = useState([]);
  const [message, setMessage] = useState("");

  // ✅ Use refs to store callbacks to avoid dependency issues
  const onTotalChangeRef = useRef(onTotalChange);
  const onMateriauxChangeRef = useRef(onMateriauxChange);

  // Update refs when callbacks change
  useEffect(() => {
    onTotalChangeRef.current = onTotalChange;
  }, [onTotalChange]);

  useEffect(() => {
    onMateriauxChangeRef.current = onMateriauxChange;
  }, [onMateriauxChange]);

  // ✅ CALCULS INSTANTANÉS
  const longueurNum = parseFloat(longueur) || 0;
  const largeurNum = parseFloat(largeur) || 0;
  const profondeurNum = parseFloat(profondeur) || 0;
  const prixUnitaireNum = parseFloat(prixUnitaire) || 0;
  const coutMainOeuvreNum = parseFloat(coutMainOeuvre) || 0;

  const volume = longueurNum * largeurNum * profondeurNum;
  const total = volume * prixUnitaireNum + coutMainOeuvreNum;

  // Matériaux
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

  // ✅ FIX: Remove callbacks from dependencies, use refs instead
  useEffect(() => { 
    console.log("🔔 [Fondation] Notification parent:", { total, cimentT, sableT, gravierT, acierT });
    onTotalChangeRef.current(total); 
  }, [total]);
  
  useEffect(() => { 
    onMateriauxChangeRef.current({ cimentT, sableT, gravierT, acierT }); 
  }, [cimentT, sableT, gravierT, acierT]);

  useEffect(() => {
    try { 
      const saved = localStorage.getItem(STORAGE_KEY); 
      if (saved) setHistorique(JSON.parse(saved)); 
    } catch {}
  }, []);

  useEffect(() => { 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historique)); 
  }, [historique]);

  const showMessage = (msg) => { 
    setMessage(msg); 
    setTimeout(() => setMessage(""), 2500); 
  };

  const handleSave = () => {
    if (volume === 0) return alert("⚠️ Veuillez entrer des dimensions valides.");
    const now = new Date();
    const entry = {
      id: now.getTime(),
      date: now.toLocaleString(),
      longueur, largeur, profondeur,
      volume: volume.toFixed(3),
      cimentT: cimentT.toFixed(3),
      cimentKg: Math.round(cimentKg),
      cimentSacs: cimentSacs.toFixed(1),
      sableT: sableT.toFixed(3),
      sableKg: Math.round(sableKg),
      sableM3: sableM3.toFixed(2),
      gravierT: gravierT.toFixed(3),
      gravierKg: Math.round(gravierKg),
      gravierM3: gravierM3.toFixed(2),
      eauL: Math.round(eauL),
      eauM3: eauM3.toFixed(2),
      acierT: acierT.toFixed(3),
      acierKg: Math.round(acierKg),
      total: total.toFixed(2),
    };
    setHistorique([entry, ...historique]);
    showMessage("✅ Calcul sauvegardé !");
  };

  const handleDelete = (id) => { 
    if (window.confirm("🗑️ Supprimer cette entrée ?")) { 
      setHistorique(historique.filter(item => item.id !== id)); 
      showMessage("🗑️ Entrée supprimée !"); 
    } 
  };
  
  const clearHistorique = () => { 
    if (window.confirm("🧹 Vider tout l'historique ?")) { 
      setHistorique([]); 
      showMessage("🧹 Historique vidé !"); 
    } 
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-2xl shadow-xl text-gray-100 font-sans relative">
      <h2 className="text-3xl font-extrabold text-orange-400 mb-6 text-center border-b border-gray-700 pb-2">🏗️ Fondation</h2>

      {message && <div className="fixed top-5 right-5 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg animate-fadeinout z-50">{message}</div>}

      <div className="grid grid-cols-2 gap-5 mb-6">
        {[
          { label: "Longueur (m)", value: longueur, setter: setLongueur, placeholder: "Ex: 100" },
          { label: "Largeur (m)", value: largeur, setter: setLargeur, placeholder: "Ex: 5" },
          { label: "Profondeur (m)", value: profondeur, setter: setProfondeur, placeholder: "Ex: 0.5" },
          { label: `Prix unitaire (${currency}/m³)`, value: prixUnitaire, setter: setPrixUnitaire, placeholder: "Ex: 6000" },
          { label: `Coût main d'œuvre (${currency})`, value: coutMainOeuvre, setter: setCoutMainOeuvre, full: true, placeholder: "Ex: 45000" },
        ].map(({ label, value, setter, full, placeholder }, i) => (
          <div className={full ? "col-span-2" : ""} key={i}>
            <label className="block mb-1 font-semibold text-orange-300">{label}</label>
            <input
              type="number"
              min="0"
              step="any"
              value={value}
              onChange={e => setter(e.target.value)}
              placeholder={placeholder}
              className="w-full px-4 py-2 rounded-2xl bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 mb-6 shadow-2xl border-2 border-orange-500/30">
        <h3 className="text-xl font-bold text-orange-400 mb-4">📊 Résultats instantanés</h3>
        <div className="space-y-2">
          <p>📦 Volume : <span className="text-orange-400 font-bold">{formatNumber(volume, 3)} m³</span></p>
          <p>🧱 Ciment : {formatNumber(cimentKg,0)} kg - {formatNumber(cimentT,3)} t - {formatNumber(cimentSacs,1)} sacs</p>
          <p>🏖️ Sable : {formatNumber(sableM3,2)} m³ - {formatNumber(sableKg,0)} kg - {formatNumber(sableT,3)} t</p>
          <p>🪨 Gravier : {formatNumber(gravierM3,2)} m³ - {formatNumber(gravierKg,0)} kg - {formatNumber(gravierT,3)} t</p>
          <p>💧 Eau : {formatNumber(eauL,0)} L - {formatNumber(eauM3,2)} m³</p>
          <p>🔩 Acier : {formatNumber(acierKg,0)} kg - {formatNumber(acierT,3)} t</p>
          <p className="mt-3 text-3xl font-bold text-orange-400 text-center">💰 Total : {formatNumber(total, 2)} {currency}</p>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4 mb-8">
        <button onClick={handleSave} disabled={volume === 0} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-2xl font-bold shadow-md transition">💾 Sauvegarder</button>
        <button onClick={clearHistorique} disabled={historique.length === 0} className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-2xl font-bold shadow-md transition">🧹 Vider l'historique</button>
      </div>

      {historique.length > 0 && (
        <section className="max-h-80 overflow-y-auto bg-gray-800 rounded-2xl p-4 shadow-inner border border-gray-700 space-y-3">
          <h3 className="text-xl font-bold text-orange-400 mb-3 text-center">🕓 Historique</h3>
          {historique.map(item => (
            <div key={item.id} className="bg-gray-700 rounded-2xl p-4 flex justify-between items-start text-sm text-gray-100">
              <div className="space-y-1 max-w-[85%]">
                <time className="block text-xs text-gray-400">{item.date}</time>
                <p>Volume : {item.volume} m³</p>
                <p>Ciment : {item.cimentKg} kg - {item.cimentT} t - {item.cimentSacs} sacs</p>
                <p>Sable : {item.sableM3} m³ - {item.sableKg} kg - {item.sableT} t</p>
                <p>Gravier : {item.gravierM3} m³ - {item.gravierKg} kg - {item.gravierT} t</p>
                <p>Eau : {item.eauL} L - {item.eauM3} m³</p>
                <p>Acier : {item.acierKg} kg - {item.acierT} t</p>
                <p className="font-bold text-orange-300">Total : {item.total} {currency}</p>
              </div>
              <button onClick={() => handleDelete(item.id)} className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 rounded-2xl text-white font-bold text-xs">✖</button>
            </div>
          ))}
        </section>
      )}

      <style>{`
        @keyframes fadeinout {
          0%, 100% { opacity: 0; }
          10%, 90% { opacity: 1; }
        }
        .animate-fadeinout { animation: fadeinout 2.5s ease forwards; }
      `}</style>
    </div>
  );
}