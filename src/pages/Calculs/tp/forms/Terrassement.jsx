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

  // ✅ Notifier parent
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

      {/* Résumé compact */}
      <div className="bg-gradient-to-r from-orange-600/20 to-orange-500/20 rounded-xl p-4 mb-6 border border-orange-500/30 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300">📦 Volume:</span>
          <span className="text-xl font-bold text-orange-400">{volume.toFixed(3)} m³</span>
          <span className="text-gray-600">|</span>
          <span className="text-sm text-gray-300">⚖️ Poids:</span>
          <span className="text-xl font-bold text-green-400">{poidsTonnes.toFixed(2)} t</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-orange-300">💰</span>
          <span className="text-2xl font-black text-orange-400">{total.toLocaleString('fr-FR')} {currency}</span>
        </div>
      </div>

      {/* Boutons */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        <button 
          onClick={handleSave} 
          disabled={volume === 0}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-bold shadow-lg transition-all transform hover:scale-105 disabled:scale-100"
        >
          💾 Sauvegarder
        </button>
        <button 
          onClick={clearHistorique} 
          disabled={historique.length === 0}
          className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-bold shadow-lg transition-all transform hover:scale-105 disabled:scale-100"
        >
          🧹 Vider l'historique
        </button>
      </div>

      {/* Historique */}
      {historique.length > 0 && (
        <section className="bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 rounded-2xl p-6 shadow-2xl border border-orange-500/30">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-700">
            <h3 className="text-2xl font-extrabold text-orange-400 flex items-center gap-3">
              <span className="text-3xl">🕓</span>
              Historique des calculs
            </h3>
            <span className="bg-orange-500/20 text-orange-400 px-4 py-2 rounded-lg font-bold">
              {historique.length} entrée{historique.length > 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {historique.map((item, index) => (
              <div 
                key={item.id} 
                className="group bg-gradient-to-r from-gray-700/50 to-gray-800/50 hover:from-gray-700 hover:to-gray-800 rounded-xl p-5 transition-all duration-300 border border-gray-700/50 hover:border-orange-500/50 hover:shadow-lg transform hover:scale-[1.02]"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 space-y-3">
                    {/* En-tête avec date et numéro */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-lg text-xs font-bold">
                          #{historique.length - index}
                        </span>
                        <time className="text-sm text-gray-400 flex items-center gap-2">
                          <span>📅</span>
                          {item.date}
                        </time>
                      </div>
                    </div>

                    {/* Grille d'informations */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                        <p className="text-xs text-gray-500 mb-1">📐 Dimensions</p>
                        <p className="text-sm font-semibold text-gray-200">
                          {item.longueur} × {item.largeur} × {item.profondeur} m
                        </p>
                      </div>
                      
                      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                        <p className="text-xs text-gray-500 mb-1">📦 Volume</p>
                        <p className="text-lg font-bold text-blue-400">{item.volume} m³</p>
                      </div>
                      
                      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                        <p className="text-xs text-gray-500 mb-1">⚖️ Poids estimé</p>
                        <p className="text-lg font-bold text-green-400">{item.poidsTonnes} t</p>
                      </div>
                      
                      <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-lg p-3 border border-orange-500/50">
                        <p className="text-xs text-orange-300 mb-1">💰 Coût total</p>
                        <p className="text-lg font-extrabold text-orange-400">
                          {parseFloat(item.total).toLocaleString('fr-FR')} {currency}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bouton supprimer */}
                  <button 
                    onClick={() => handleDelete(item.id)} 
                    className="ml-2 p-3 bg-red-600/80 hover:bg-red-600 rounded-xl text-white font-bold transition-all transform hover:scale-110 group-hover:shadow-lg"
                    title="Supprimer"
                  >
                    ✖
                  </button>
                </div>
              </div>
            ))}
          </div>
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
        
        /* Scrollbar personnalisée */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(251, 146, 60, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(251, 146, 60, 0.8);
        }
      `}</style>
    </div>
  );
}