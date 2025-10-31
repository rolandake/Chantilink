import React, { useEffect, useState } from "react";

const STORAGE_KEY = "terrassement-history";
const DENSITY_TERRE = 1.7; // t/m³

export default function Terrassement({ currency = "XOF", onTotalChange = () => {} }) {
  const [longueur, setLongueur] = useState("");
  const [largeur, setLargeur] = useState("");
  const [profondeur, setProfondeur] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [coutMainOeuvre, setCoutMainOeuvre] = useState("");
  const [historique, setHistorique] = useState([]);
  const [message, setMessage] = useState("");

  // ✅ CALCULS INSTANTANÉS
  const longueurNum = parseFloat(longueur) || 0;
  const largeurNum = parseFloat(largeur) || 0;
  const profondeurNum = parseFloat(profondeur) || 0;
  const prixUnitaireNum = parseFloat(prixUnitaire) || 0;
  const coutMainOeuvreNum = parseFloat(coutMainOeuvre) || 0;

  const volume = longueurNum * largeurNum * profondeurNum;
  const poidsTonnes = volume * DENSITY_TERRE;
  const total = volume * prixUnitaireNum + coutMainOeuvreNum;

  // ✅ Notifier parent - CORRECTION: retirer onTotalChange des dépendances
  useEffect(() => {
    onTotalChange(total);
  }, [total]);

  // Historique local
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setHistorique(JSON.parse(saved)); } catch {}
    }
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
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      longueur,
      largeur,
      profondeur,
      volume: volume.toFixed(3),
      poidsTonnes: poidsTonnes.toFixed(2),
      prixUnitaire,
      coutMainOeuvre,
      total: total.toFixed(2),
    };
    setHistorique([entry, ...historique]);
    showMessage("✅ Calcul sauvegardé !");
  };

  const handleDelete = (id) => {
    if (confirm("🗑️ Supprimer cette entrée ?")) {
      setHistorique(historique.filter((item) => item.id !== id));
      showMessage("🗑️ Entrée supprimée !");
    }
  };

  const clearHistorique = () => {
    if (confirm("🧹 Vider tout l'historique ?")) {
      setHistorique([]);
      showMessage("🧹 Historique vidé !");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-2xl shadow-xl text-gray-100 font-sans relative">
      <h2 className="text-3xl font-extrabold text-orange-400 mb-6 text-center border-b border-gray-700 pb-2">
        📏 Terrassement
      </h2>

      {message && (
        <div className="fixed top-5 right-5 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg animate-fadeinout z-50">
          {message}
        </div>
      )}

      {/* Formulaire */}
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
              onChange={(e) => setter(e.target.value)}
              placeholder={placeholder}
              className="w-full px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        ))}
      </div>

      {/* Résultats instantanés */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 mb-6 shadow-2xl border-2 border-orange-500/30">
        <h3 className="text-xl font-bold text-orange-400 mb-4 flex items-center gap-2">
          <span>📊</span> Résultats instantanés
        </h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
            <span className="text-gray-300">📦 Volume :</span>
            <span className="text-2xl font-bold text-orange-400">
              {volume.toFixed(3)} m³
            </span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
            <span className="text-gray-300">⚖️ Poids estimé :</span>
            <span className="text-2xl font-bold text-green-400">
              {poidsTonnes.toFixed(2)} t
            </span>
          </div>
          
          <div className="flex justify-between items-center p-4 bg-gradient-to-r from-orange-600/20 to-orange-500/20 rounded-lg border border-orange-500/30 mt-4">
            <span className="text-lg font-semibold text-orange-300">💰 Coût total :</span>
            <span className="text-3xl font-black text-orange-400">
              {total.toLocaleString('fr-FR')} {currency}
            </span>
          </div>
        </div>

        {/* Détail du calcul */}
        <div className="mt-4 p-4 bg-gray-800/50 rounded-lg text-sm text-gray-400 border border-gray-700">
          <div className="font-semibold text-orange-300 mb-2">🧮 Détail du calcul :</div>
          <div className="space-y-1 font-mono">
            <div>Volume = {longueurNum} × {largeurNum} × {profondeurNum} = <span className="text-orange-400 font-bold">{volume.toFixed(3)} m³</span></div>
            <div>Poids = {volume.toFixed(3)} × 1.7 = <span className="text-green-400 font-bold">{poidsTonnes.toFixed(2)} t</span></div>
            <div>Coût = ({volume.toFixed(3)} × {prixUnitaireNum}) + {coutMainOeuvreNum} = <span className="text-orange-400 font-bold">{total.toLocaleString('fr-FR')} {currency}</span></div>
          </div>
        </div>
      </div>

      {/* Boutons */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        <button 
          onClick={handleSave} 
          disabled={volume === 0}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-2xl font-bold shadow-md transition"
        >
          💾 Sauvegarder
        </button>
        <button 
          onClick={clearHistorique} 
          disabled={historique.length === 0}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-2xl font-bold shadow-md transition"
        >
          🧹 Vider l'historique
        </button>
      </div>

      {/* Historique */}
      {historique.length > 0 && (
        <section className="max-h-80 overflow-y-auto bg-gray-800 rounded-2xl p-4 shadow-inner border border-gray-700 space-y-3">
          <h3 className="text-xl font-bold text-orange-400 mb-3 text-center">🕓 Historique</h3>
          {historique.map(item => (
            <div key={item.id} className="bg-gray-700 rounded-xl p-4 flex justify-between items-start text-sm text-gray-100 hover:bg-gray-600 transition">
              <div className="space-y-1 max-w-[85%]">
                <time className="block text-xs text-gray-400">{item.date}</time>
                <p>📐 Dimensions : {item.longueur} × {item.largeur} × {item.profondeur} m</p>
                <p>📦 Volume : {item.volume} m³</p>
                <p>⚖️ Poids : {item.poidsTonnes} t</p>
                <p className="font-bold text-orange-300">💰 Total : {parseFloat(item.total).toLocaleString('fr-FR')} {currency}</p>
              </div>
              <button 
                onClick={() => handleDelete(item.id)} 
                className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 rounded-2xl text-white font-bold text-xs transition"
              >
                ✖
              </button>
            </div>
          ))}
        </section>
      )}

      <style>{`
        @keyframes fadeinout {
          0%, 100% { opacity: 0; }
          10%, 90% { opacity: 1; }
        }
        .animate-fadeinout {
          animation: fadeinout 2.5s ease forwards;
        }
      `}</style>
    </div>
  );
}