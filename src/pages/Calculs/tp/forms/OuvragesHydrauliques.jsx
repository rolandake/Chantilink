import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY_DALOT = "dalot-history";
const STORAGE_KEY_CANIVEAU = "caniveau-history";
const STORAGE_KEY_BUSE = "buse-history";

// Composant Dalot
function DalotForm({ currency, onTotalChange }) {
  const [longueur, setLongueur] = useState("");
  const [largeur, setLargeur] = useState("");
  const [hauteur, setHauteur] = useState("");
  const [epaisseur, setEpaisseur] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [coutMainOeuvre, setCoutMainOeuvre] = useState("");
  const [historique, setHistorique] = useState([]);
  const [message, setMessage] = useState("");

  const L = parseFloat(longueur) || 0;
  const l = parseFloat(largeur) || 0;
  const h = parseFloat(hauteur) || 0;
  const e = parseFloat(epaisseur) || 0;

  const volumeBeton = L * ((l + 2 * e) * (h + e) - l * h);
  const cimentKg = volumeBeton * 350;
  const cimentT = cimentKg / 1000;
  const sableM3 = volumeBeton * 0.43;
  const sableT = sableM3 * 1.6;
  const gravierM3 = volumeBeton * 0.85;
  const gravierT = gravierM3 * 1.75;
  const eauL = volumeBeton * 175;
  const acierKg = volumeBeton * 120;
  const acierT = acierKg / 1000;

  const coutMateriaux = volumeBeton * (parseFloat(prixUnitaire) || 0);
  const total = coutMateriaux + (parseFloat(coutMainOeuvre) || 0);

  useEffect(() => { onTotalChange(total); }, [total]);
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_DALOT);
    if (saved) { try { setHistorique(JSON.parse(saved)); } catch {} }
  }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_DALOT, JSON.stringify(historique)); }, [historique]);

  const showMessage = (msg) => { setMessage(msg); setTimeout(() => setMessage(""), 2500); };
  const handleSave = () => {
    if (volumeBeton === 0) return alert("⚠️ Veuillez entrer des dimensions valides.");
    setHistorique([{ id: Date.now(), date: new Date().toLocaleString(), longueur, largeur, hauteur, epaisseur, volumeBeton: volumeBeton.toFixed(3), cimentT: cimentT.toFixed(2), sableT: sableT.toFixed(2), gravierT: gravierT.toFixed(2), acierT: acierT.toFixed(2), prixUnitaire, coutMainOeuvre, total: total.toFixed(2) }, ...historique]);
    showMessage("✅ Calcul sauvegardé !");
  };
  const handleDelete = (id) => { if (confirm("🗑️ Supprimer cette entrée ?")) { setHistorique(historique.filter((item) => item.id !== id)); showMessage("🗑️ Entrée supprimée !"); } };
  const clearHistorique = () => { if (confirm("🧹 Vider tout l'historique ?")) { setHistorique([]); showMessage("🧹 Historique vidé !"); } };

  return (
    <div>
      {message && <div className="fixed top-5 right-5 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg animate-fadeinout z-50">{message}</div>}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[{ label: "Longueur (m)", value: longueur, setter: setLongueur }, { label: "Largeur intérieure (m)", value: largeur, setter: setLargeur }, { label: "Hauteur intérieure (m)", value: hauteur, setter: setHauteur }, { label: "Épaisseur parois (m)", value: epaisseur, setter: setEpaisseur }, { label: `Prix unitaire (${currency}/m³)`, value: prixUnitaire, setter: setPrixUnitaire }, { label: `Coût main d'œuvre (${currency})`, value: coutMainOeuvre, setter: setCoutMainOeuvre }].map(({ label, value, setter }, idx) => (
          <div key={idx}><label className="block mb-1 font-semibold text-blue-400 text-sm">{label}</label><input type="number" min="0" step="any" value={value} onInput={e => setter(e.target.value)} className={`w-full rounded-md px-3 py-2 border border-gray-700 focus:ring-2 focus:ring-blue-400 transition ${value <= 0 ? "bg-red-800/30" : "bg-gray-800"}`} placeholder="0" /></div>
        ))}
      </div>
      <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-5 shadow-lg border border-blue-500/30 mb-4">
        <div className="text-center mb-4"><p className="text-sm text-gray-400">Volume de béton</p><p className="text-4xl font-bold text-blue-400">{volumeBeton.toFixed(3)} m³</p></div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-gray-900/50 p-3 rounded"><p className="text-gray-400">🧱 Ciment</p><p className="text-xl font-bold text-green-400">{cimentT.toFixed(2)} t</p></div>
          <div className="bg-gray-900/50 p-3 rounded"><p className="text-gray-400">🏖️ Sable</p><p className="text-xl font-bold text-green-400">{sableT.toFixed(2)} t</p></div>
          <div className="bg-gray-900/50 p-3 rounded"><p className="text-gray-400">🪨 Gravier</p><p className="text-xl font-bold text-green-400">{gravierT.toFixed(2)} t</p></div>
          <div className="bg-gray-900/50 p-3 rounded"><p className="text-gray-400">💧 Eau</p><p className="text-xl font-bold text-blue-400">{eauL.toFixed(0)} L</p></div>
          <div className="bg-gray-900/50 p-3 rounded col-span-2"><p className="text-gray-400">🔩 Acier</p><p className="text-xl font-bold text-red-400">{acierT.toFixed(2)} t</p></div>
        </div>
        <div className="border-t border-gray-600 pt-4 mt-4"><p className="text-center text-3xl font-extrabold text-blue-400 animate-pulse">💰 Total : {total.toLocaleString()} {currency}</p></div>
      </div>
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        <button onClick={handleSave} disabled={volumeBeton === 0} className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-bold shadow-lg transition-all transform hover:scale-105">💾 Sauvegarder</button>
        <button onClick={clearHistorique} disabled={historique.length === 0} className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-bold shadow-lg transition-all transform hover:scale-105">🧹 Vider l'historique</button>
      </div>
      {historique.length > 0 && (
        <section className="bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 rounded-2xl p-6 shadow-2xl border border-blue-500/30">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-700">
            <h3 className="text-2xl font-extrabold text-blue-400 flex items-center gap-3"><span className="text-3xl">🕓</span>Historique Dalot</h3>
            <span className="bg-blue-500/20 text-blue-400 px-4 py-2 rounded-lg font-bold">{historique.length} entrée{historique.length > 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {historique.map((item, index) => (
              <div key={item.id} className="group bg-gradient-to-r from-gray-700/50 to-gray-800/50 hover:from-gray-700 hover:to-gray-800 rounded-xl p-5 transition-all duration-300 border border-gray-700/50 hover:border-blue-500/50 hover:shadow-lg">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3"><span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg text-xs font-bold">#{historique.length - index}</span><time className="text-sm text-gray-400">{item.date}</time></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-900/50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">📐 Dimensions</p><p className="text-sm font-semibold text-gray-200">L:{item.longueur} × l:{item.largeur} × H:{item.hauteur} × E:{item.epaisseur} m</p></div>
                      <div className="bg-gray-900/50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">📦 Volume béton</p><p className="text-lg font-bold text-blue-400">{item.volumeBeton} m³</p></div>
                      <div className="bg-gray-900/50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">🧱 Matériaux</p><p className="text-sm text-green-400">C:{item.cimentT}t S:{item.sableT}t G:{item.gravierT}t</p></div>
                      <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg p-3 border border-blue-500/50"><p className="text-xs text-blue-300 mb-1">💰 Coût total</p><p className="text-lg font-extrabold text-blue-400">{parseFloat(item.total).toLocaleString()} {currency}</p></div>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(item.id)} className="p-3 bg-red-600/80 hover:bg-red-600 rounded-xl text-white font-bold transition-all transform hover:scale-110">✖</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Composant Caniveau (code similaire mais avec formules caniveau)
function CaniveauForm({ currency, onTotalChange }) {
  const [longueur, setLongueur] = useState("");
  const [largeurHaut, setLargeurHaut] = useState("");
  const [largeurBas, setLargeurBas] = useState("");
  const [profondeur, setProfondeur] = useState("");
  const [epaisseur, setEpaisseur] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [coutMainOeuvre, setCoutMainOeuvre] = useState("");
  const [historique, setHistorique] = useState([]);
  const [message, setMessage] = useState("");

  const L = parseFloat(longueur) || 0;
  const lh = parseFloat(largeurHaut) || 0;
  const lb = parseFloat(largeurBas) || 0;
  const p = parseFloat(profondeur) || 0;
  const e = parseFloat(epaisseur) || 0;

  const volumeBeton = L * (((lh + lb) / 2) * p + e * (lh + p));
  const cimentT = (volumeBeton * 350) / 1000;
  const sableT = (volumeBeton * 0.43) * 1.6;
  const gravierT = (volumeBeton * 0.85) * 1.75;
  const eauL = volumeBeton * 175;
  const total = volumeBeton * (parseFloat(prixUnitaire) || 0) + (parseFloat(coutMainOeuvre) || 0);

  useEffect(() => { onTotalChange(total); }, [total]);
  useEffect(() => { const saved = localStorage.getItem(STORAGE_KEY_CANIVEAU); if (saved) { try { setHistorique(JSON.parse(saved)); } catch {} } }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_CANIVEAU, JSON.stringify(historique)); }, [historique]);

  const showMessage = (msg) => { setMessage(msg); setTimeout(() => setMessage(""), 2500); };
  const handleSave = () => {
    if (volumeBeton === 0) return alert("⚠️ Veuillez entrer des dimensions valides.");
    setHistorique([{ id: Date.now(), date: new Date().toLocaleString(), longueur, largeurHaut, largeurBas, profondeur, epaisseur, volumeBeton: volumeBeton.toFixed(3), cimentT: cimentT.toFixed(2), sableT: sableT.toFixed(2), gravierT: gravierT.toFixed(2), prixUnitaire, coutMainOeuvre, total: total.toFixed(2) }, ...historique]);
    showMessage("✅ Calcul sauvegardé !");
  };
  const handleDelete = (id) => { if (confirm("🗑️ Supprimer cette entrée ?")) { setHistorique(historique.filter((item) => item.id !== id)); showMessage("🗑️ Entrée supprimée !"); } };
  const clearHistorique = () => { if (confirm("🧹 Vider tout l'historique ?")) { setHistorique([]); showMessage("🧹 Historique vidé !"); } };

  return (
    <div>
      {message && <div className="fixed top-5 right-5 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg animate-fadeinout z-50">{message}</div>}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[{ label: "Longueur (m)", value: longueur, setter: setLongueur }, { label: "Largeur haut (m)", value: largeurHaut, setter: setLargeurHaut }, { label: "Largeur bas (m)", value: largeurBas, setter: setLargeurBas }, { label: "Profondeur (m)", value: profondeur, setter: setProfondeur }, { label: "Épaisseur (m)", value: epaisseur, setter: setEpaisseur }, { label: `Prix unitaire (${currency}/m³)`, value: prixUnitaire, setter: setPrixUnitaire }, { label: `Coût main d'œuvre (${currency})`, value: coutMainOeuvre, setter: setCoutMainOeuvre, full: true }].map(({ label, value, setter, full }, idx) => (
          <div key={idx} className={full ? "col-span-2" : ""}><label className="block mb-1 font-semibold text-teal-400 text-sm">{label}</label><input type="number" min="0" step="any" value={value} onInput={e => setter(e.target.value)} className={`w-full rounded-md px-3 py-2 border border-gray-700 focus:ring-2 focus:ring-teal-400 transition ${value <= 0 ? "bg-red-800/30" : "bg-gray-800"}`} placeholder="0" /></div>
        ))}
      </div>
      <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-5 shadow-lg border border-teal-500/30 mb-4">
        <div className="text-center mb-4"><p className="text-sm text-gray-400">Volume de béton</p><p className="text-4xl font-bold text-teal-400">{volumeBeton.toFixed(3)} m³</p></div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-900/50 p-3 rounded"><p className="text-gray-400">🧱 Ciment</p><p className="text-xl font-bold text-green-400">{cimentT.toFixed(2)} t</p></div>
          <div className="bg-gray-900/50 p-3 rounded"><p className="text-gray-400">🏖️ Sable</p><p className="text-xl font-bold text-green-400">{sableT.toFixed(2)} t</p></div>
          <div className="bg-gray-900/50 p-3 rounded"><p className="text-gray-400">🪨 Gravier</p><p className="text-xl font-bold text-green-400">{gravierT.toFixed(2)} t</p></div>
          <div className="bg-gray-900/50 p-3 rounded"><p className="text-gray-400">💧 Eau</p><p className="text-xl font-bold text-blue-400">{eauL.toFixed(0)} L</p></div>
        </div>
        <div className="border-t border-gray-600 pt-4 mt-4"><p className="text-center text-3xl font-extrabold text-teal-400 animate-pulse">💰 Total : {total.toLocaleString()} {currency}</p></div>
      </div>
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        <button onClick={handleSave} disabled={volumeBeton === 0} className="px-8 py-3 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-bold shadow-lg transition-all transform hover:scale-105">💾 Sauvegarder</button>
        <button onClick={clearHistorique} disabled={historique.length === 0} className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-bold shadow-lg transition-all transform hover:scale-105">🧹 Vider l'historique</button>
      </div>
      {historique.length > 0 && (
        <section className="bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 rounded-2xl p-6 shadow-2xl border border-teal-500/30">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-700">
            <h3 className="text-2xl font-extrabold text-teal-400 flex items-center gap-3"><span className="text-3xl">🕓</span>Historique Caniveau</h3>
            <span className="bg-teal-500/20 text-teal-400 px-4 py-2 rounded-lg font-bold">{historique.length} entrée{historique.length > 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {historique.map((item, index) => (
              <div key={item.id} className="group bg-gradient-to-r from-gray-700/50 to-gray-800/50 hover:from-gray-700 hover:to-gray-800 rounded-xl p-5 transition-all duration-300 border border-gray-700/50 hover:border-teal-500/50 hover:shadow-lg">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3"><span className="bg-teal-500/20 text-teal-400 px-3 py-1 rounded-lg text-xs font-bold">#{historique.length - index}</span><time className="text-sm text-gray-400">{item.date}</time></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-900/50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">📐 Dimensions</p><p className="text-sm font-semibold text-gray-200">L:{item.longueur} × H:{item.largeurHaut} × B:{item.largeurBas} × P:{item.profondeur} m</p></div>
                      <div className="bg-gray-900/50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">📦 Volume béton</p><p className="text-lg font-bold text-teal-400">{item.volumeBeton} m³</p></div>
                      <div className="bg-gray-900/50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">🧱 Matériaux</p><p className="text-sm text-green-400">C:{item.cimentT}t S:{item.sableT}t G:{item.gravierT}t</p></div>
                      <div className="bg-gradient-to-br from-teal-500/20 to-teal-600/20 rounded-lg p-3 border border-teal-500/50"><p className="text-xs text-teal-300 mb-1">💰 Coût total</p><p className="text-lg font-extrabold text-teal-400">{parseFloat(item.total).toLocaleString()} {currency}</p></div>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(item.id)} className="p-3 bg-red-600/80 hover:bg-red-600 rounded-xl text-white font-bold transition-all transform hover:scale-110">✖</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Composant Buse
function BuseForm({ currency, onTotalChange }) {
  const [diametre, setDiametre] = useState("");
  const [longueur, setLongueur] = useState("");
  const [epaisseur, setEpaisseur] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [coutMainOeuvre, setCoutMainOeuvre] = useState("");
  const [historique, setHistorique] = useState([]);
  const [message, setMessage] = useState("");

  const d = parseFloat(diametre) || 0;
  const L = parseFloat(longueur) || 0;
  const e = parseFloat(epaisseur) || 0;
  const rayonExt = (d + 2 * e) / 2;
  const rayonInt = d / 2;
  const volumeBeton = Math.PI * L * (rayonExt ** 2 - rayonInt ** 2);
  const cimentT = (volumeBeton * 350) / 1000;
  const sableT = (volumeBeton * 0.43) * 1.6;
  const gravierT = (volumeBeton * 0.85) * 1.75;
  const eauL = volumeBeton * 175;
  const acierT = (volumeBeton * 100) / 1000;
  const total = volumeBeton * (parseFloat(prixUnitaire) || 0) + (parseFloat(coutMainOeuvre) || 0);

  useEffect(() => { onTotalChange(total); }, [total]);
  useEffect(() => { const saved = localStorage.getItem(STORAGE_KEY_BUSE); if (saved) { try { setHistorique(JSON.parse(saved)); } catch {} } }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_BUSE, JSON.stringify(historique)); }, [historique]);

  const showMessage = (msg) => { setMessage(msg); setTimeout(() => setMessage(""), 2500); };
  const handleSave = () => {
    if (volumeBeton === 0) return alert("⚠️ Veuillez entrer des dimensions valides.");
    setHistorique([{ id: Date.now(), date: new Date().toLocaleString(), diametre, longueur, epaisseur, volumeBeton: volumeBeton.toFixed(3), cimentT: cimentT.toFixed(2), sableT: sableT.toFixed(2), gravierT: gravierT.toFixed(2), acierT: acierT.toFixed(2), prixUnitaire, coutMainOeuvre, total: total.toFixed(2) }, ...historique]);
    showMessage("✅ Calcul sauvegardé !");
  };
  const handleDelete = (id) => { if (confirm("🗑️ Supprimer cette entrée ?")) { setHistorique(historique.filter((item) => item.id !== id)); showMessage("🗑️ Entrée supprimée !"); } };
  const clearHistorique = () => { if (confirm("🧹 Vider tout l'historique ?")) { setHistorique([]); showMessage("🧹 Historique vidé !"); } };

  return (
    <div>
      {message && <div className="fixed top-5 right-5 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg animate-fadeinout z-50">{message}</div>}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[{ label: "Diamètre intérieur (m)", value: diametre, setter: setDiametre }, { label: "Longueur (m)", value: longueur, setter: setLongueur }, { label: "Épaisseur paroi (m)", value: epaisseur, setter: setEpaisseur }, { label: `Prix unitaire (${currency}/m³)`, value: prixUnitaire, setter: setPrixUnitaire }, { label: `Coût main d'œuvre (${currency})`, value: coutMainOeuvre, setter: setCoutMainOeuvre, full: true }].map(({ label, value, setter, full }, idx) => (
          <div key={idx} className={full ? "col-span-2" : ""}><label className="block mb-1 font-semibold text-indigo-400 text-sm">{label}</label><input type="number" min="0" step="any" value={value} onInput={e => setter(e.target.value)} className={`w-full rounded-md px-3 py-2 border border-gray-700 focus:ring-2 focus:ring-indigo-400 transition ${value <= 0 ? "bg-red-800/30" : "bg-gray-800"}`} placeholder="0" /></div>
        ))}
      </div>
      <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-5 shadow-lg border border-indigo-500/30 mb-4">
        <div className="text-center mb-4"><p className="text-sm text-gray-400">Volume de béton</p><p className="text-4xl font-bold text-indigo-400">{volumeBeton.toFixed(3)} m³</p></div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-gray-900/50 p-3 rounded"><p className="text-gray-400">🧱 Ciment</p><p className="text-xl font-bold text-green-400">{cimentT.toFixed(2)} t</p></div>
          <div className="bg-gray-900/50 p-3 rounded"><p className="text-gray-400">🏖️ Sable</p><p className="text-xl font-bold text-green-400">{sableT.toFixed(2)} t</p></div>
          <div className="bg-gray-900/50 p-3 rounded"><p className="text-gray-400">🪨 Gravier</p><p className="text-xl font-bold text-green-400">{gravierT.toFixed(2)} t</p></div>
          <div className="bg-gray-900/50 p-3 rounded"><p className="text-gray-400">💧 Eau</p><p className="text-xl font-bold text-blue-400">{eauL.toFixed(0)} L</p></div>
          <div className="bg-gray-900/50 p-3 rounded col-span-2"><p className="text-gray-400">🔩 Acier</p><p className="text-xl font-bold text-red-400">{acierT.toFixed(2)} t</p></div>
        </div>
        <div className="border-t border-gray-600 pt-4 mt-4"><p className="text-center text-3xl font-extrabold text-indigo-400 animate-pulse">💰 Total : {total.toLocaleString()} {currency}</p></div>
      </div>
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        <button onClick={handleSave} disabled={volumeBeton === 0} className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-bold shadow-lg transition-all transform hover:scale-105">💾 Sauvegarder</button>
        <button onClick={clearHistorique} disabled={historique.length === 0} className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-bold shadow-lg transition-all transform hover:scale-105">🧹 Vider l'historique</button>
      </div>
      {historique.length > 0 && (
        <section className="bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 rounded-2xl p-6 shadow-2xl border border-indigo-500/30">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-700">
            <h3 className="text-2xl font-extrabold text-indigo-400 flex items-center gap-3"><span className="text-3xl">🕓</span>Historique Buse</h3>
            <span className="bg-indigo-500/20 text-indigo-400 px-4 py-2 rounded-lg font-bold">{historique.length} entrée{historique.length > 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {historique.map((item, index) => (
              <div key={item.id} className="group bg-gradient-to-r from-gray-700/50 to-gray-800/50 hover:from-gray-700 hover:to-gray-800 rounded-xl p-5 transition-all duration-300 border border-gray-700/50 hover:border-indigo-500/50 hover:shadow-lg">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3"><span className="bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-lg text-xs font-bold">#{historique.length - index}</span><time className="text-sm text-gray-400">{item.date}</time></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-900/50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">📐 Dimensions</p><p className="text-sm font-semibold text-gray-200">Ø:{item.diametre} × L:{item.longueur} × E:{item.epaisseur} m</p></div>
                      <div className="bg-gray-900/50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">📦 Volume béton</p><p className="text-lg font-bold text-indigo-400">{item.volumeBeton} m³</p></div>
                      <div className="bg-gray-900/50 rounded-lg p-3"><p className="text-xs text-gray-500 mb-1">🧱 Matériaux</p><p className="text-sm text-green-400">C:{item.cimentT}t S:{item.sableT}t G:{item.gravierT}t</p></div>
                      <div className="bg-gradient-to-br from-indigo-500/20 to-indigo-600/20 rounded-lg p-3 border border-indigo-500/50"><p className="text-xs text-indigo-300 mb-1">💰 Coût total</p><p className="text-lg font-extrabold text-indigo-400">{parseFloat(item.total).toLocaleString()} {currency}</p></div>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(item.id)} className="p-3 bg-red-600/80 hover:bg-red-600 rounded-xl text-white font-bold transition-all transform hover:scale-110">✖</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// Composant principal
export default function OuvragesHydrauliques({ currency = "XOF", onCostChange = () => {}, onMateriauxChange = () => {} }) {
  const [type, setType] = useState("dalot");
  const [costs, setCosts] = useState({ dalot: 0, caniveau: 0, buse: 0 });

  useEffect(() => { onCostChange(costs[type] || 0); }, [costs, type]);

  const handleCostChange = (ouvrageType) => (value) => {
    setCosts((prev) => ({ ...prev, [ouvrageType]: Number(value) || 0 }));
  };

  const ouvrageTypes = [
    { value: "dalot", label: "💧 Dalot", color: "from-blue-400 to-cyan-500", description: "Ouvrage de drainage rectangulaire" },
    { value: "caniveau", label: "🌊 Caniveau", color: "from-teal-400 to-green-500", description: "Canal d'évacuation des eaux" },
    { value: "buse", label: "⭕ Buse", color: "from-indigo-400 to-blue-500", description: "Conduite circulaire enterrée" },
  ];

  const currentOuvrage = ouvrageTypes.find(o => o.value === type);

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-xl shadow-lg text-gray-100 font-sans animate-fade-in">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center animate-pulse">💧 Ouvrages Hydrauliques</h2>

      <div className="mb-8">
        <label className="block mb-3 font-semibold text-orange-400 text-lg">Choisissez un type d'ouvrage</label>
        <div className="grid grid-cols-3 gap-4">
          {ouvrageTypes.map((ouvrage) => (
            <button key={ouvrage.value} onClick={() => setType(ouvrage.value)} className={`p-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${type === ouvrage.value ? `bg-gradient-to-r ${ouvrage.color} text-white shadow-lg scale-105` : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}>
              <div className="text-2xl mb-2">{ouvrage.label.split(' ')[0]}</div>
              <div className="text-sm">{ouvrage.label.split(' ')[1]}</div>
            </button>
          ))}
        </div>
        {currentOuvrage && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-center text-sm text-gray-400 italic">{currentOuvrage.description}</motion.div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={type} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.3 }} className="bg-gray-800/50 rounded-xl p-5 backdrop-blur-sm">
          {type === "dalot" && <DalotForm currency={currency} onTotalChange={handleCostChange("dalot")} />}
          {type === "caniveau" && <CaniveauForm currency={currency} onTotalChange={handleCostChange("caniveau")} />}
          {type === "buse" && <BuseForm currency={currency} onTotalChange={handleCostChange("buse")} />}
        </motion.div>
      </AnimatePresence>

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
        @keyframes fadeinout { 0%, 100% { opacity: 0; } 10%, 90% { opacity: 1; } }
        .animate-fadeinout { animation: fadeinout 2.5s ease forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(31, 41, 55, 0.5); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(96, 165, 250, 0.5); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(96, 165, 250, 0.8); }
      `}</style>
    </div>
  );
}