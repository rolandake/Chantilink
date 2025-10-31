import React, { useState, useEffect } from "react";

const STORAGE_KEY = "finitions-history";

export default function Finitions({ currency = "XOF", onCostChange = () => {} }) {
  const typesFinition = [
    { value: "peinture", label: "Peinture", emoji: "🎨", color: "blue" },
    { value: "carrelage", label: "Carrelage", emoji: "🏺", color: "amber" },
    { value: "parquet", label: "Parquet", emoji: "🪵", color: "yellow" },
    { value: "platre", label: "Plâtre", emoji: "🧱", color: "gray" },
    { value: "faience", label: "Faïence", emoji: "✨", color: "cyan" },
    { value: "autre", label: "Autre", emoji: "🔧", color: "purple" },
  ];

  const [typeFinition, setTypeFinition] = useState("peinture");
  const [surface, setSurface] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [couches, setCouches] = useState("");
  const [historique, setHistorique] = useState([]);
  const [message, setMessage] = useState("");

  const total = (parseFloat(surface) || 0) * (parseFloat(prixUnitaire) || 0);

  // Mise à jour du coût total
  useEffect(() => {
    onCostChange(total);
  }, [total, onCostChange]);

  // Historique
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
    if (total === 0) return alert("⚠️ Veuillez entrer des valeurs valides.");
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      type: typeFinition,
      surface,
      prixUnitaire,
      couches: typeFinition === "peinture" ? couches : null,
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

  const currentType = typesFinition.find(t => t.value === typeFinition);

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-xl shadow-lg text-gray-100 font-sans animate-fade-in">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center animate-pulse">
        🎨 Finitions
      </h2>

      {message && (
        <div className="fixed top-5 right-5 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg animate-fadeinout z-50">
          {message}
        </div>
      )}

      {/* Sélection par boutons */}
      <div className="mb-8">
        <label className="block mb-3 font-semibold text-orange-400 text-lg">
          Type de finition
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {typesFinition.map((type) => (
            <button
              key={type.value}
              onClick={() => setTypeFinition(type.value)}
              className={`p-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                typeFinition === type.value
                  ? "bg-orange-500 text-white shadow-lg scale-105"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              <div className="text-3xl mb-2">{type.emoji}</div>
              <div className="text-sm">{type.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Formulaire */}
      <div className="bg-gray-800/50 rounded-xl p-5 mb-6 backdrop-blur-sm">
        <h3 className="text-lg font-bold text-center mb-4 flex items-center justify-center gap-2">
          <span className="text-2xl">{currentType?.emoji}</span>
          <span className="text-orange-400">{currentType?.label}</span>
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-semibold text-orange-400 text-sm">Surface (m²)</label>
            <input
              type="number"
              min="0"
              step="any"
              value={surface}
              onInput={(e) => setSurface(e.target.value)}
              className={`w-full rounded-md px-3 py-2 border border-gray-700 focus:ring-2 focus:ring-orange-400 transition ${
                !surface ? "bg-red-800/30" : "bg-gray-800"
              }`}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block mb-1 font-semibold text-orange-400 text-sm">Prix unitaire ({currency}/m²)</label>
            <input
              type="number"
              min="0"
              step="any"
              value={prixUnitaire}
              onInput={(e) => setPrixUnitaire(e.target.value)}
              className={`w-full rounded-md px-3 py-2 border border-gray-700 focus:ring-2 focus:ring-orange-400 transition ${
                !prixUnitaire ? "bg-red-800/30" : "bg-gray-800"
              }`}
              placeholder="0"
            />
          </div>

          {typeFinition === "peinture" && (
            <div className="col-span-2">
              <label className="block mb-1 font-semibold text-orange-400 text-sm">Nombre de couches (optionnel)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={couches}
                onInput={(e) => setCouches(e.target.value)}
                className="w-full rounded-md px-3 py-2 border border-gray-700 focus:ring-2 focus:ring-orange-400 bg-gray-800"
                placeholder="Ex: 2"
              />
            </div>
          )}
        </div>
      </div>

      {/* Résultats */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-5 shadow-lg border border-orange-500/30 mb-6">
        <div className="text-center mb-4">
          <p className="text-sm text-gray-400">Surface à traiter</p>
          <p className="text-4xl font-bold text-orange-400">{surface || 0} m²</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-900/50 p-3 rounded">
            <p className="text-gray-400">{currentType?.emoji} Type</p>
            <p className="text-xl font-bold text-green-400 capitalize">{currentType?.label}</p>
          </div>

          <div className="bg-gray-900/50 p-3 rounded">
            <p className="text-gray-400">💵 Prix/m²</p>
            <p className="text-xl font-bold text-blue-400">{parseFloat(prixUnitaire || 0).toLocaleString()} {currency}</p>
          </div>

          {typeFinition === "peinture" && couches && (
            <div className="bg-gray-900/50 p-3 rounded col-span-2">
              <p className="text-gray-400">🖌️ Nombre de couches</p>
              <p className="text-xl font-bold text-purple-400">{couches} couche{couches > 1 ? 's' : ''}</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-600 pt-4 mt-4">
          <p className="text-center text-3xl font-extrabold text-orange-400 animate-pulse">
            💰 Total : {total.toLocaleString()} {currency}
          </p>
        </div>
      </div>

      {/* Boutons */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        <button 
          onClick={handleSave} 
          disabled={total === 0}
          className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-bold shadow-lg transition-all transform hover:scale-105"
        >
          💾 Sauvegarder
        </button>
        <button 
          onClick={clearHistorique} 
          disabled={historique.length === 0}
          className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-bold shadow-lg transition-all transform hover:scale-105"
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
              Historique Finitions
            </h3>
            <span className="bg-orange-500/20 text-orange-400 px-4 py-2 rounded-lg font-bold">
              {historique.length} entrée{historique.length > 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {historique.map((item, index) => {
              const typeInfo = typesFinition.find(t => t.value === item.type);
              return (
                <div 
                  key={item.id} 
                  className="group bg-gradient-to-r from-gray-700/50 to-gray-800/50 hover:from-gray-700 hover:to-gray-800 rounded-xl p-5 transition-all duration-300 border border-gray-700/50 hover:border-orange-500/50 hover:shadow-lg"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-lg text-xs font-bold">
                            #{historique.length - index}
                          </span>
                          <time className="text-sm text-gray-400">{item.date}</time>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-900/50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">🎨 Type</p>
                          <p className="text-lg font-semibold text-gray-200 capitalize flex items-center gap-2">
                            <span className="text-2xl">{typeInfo?.emoji}</span>
                            {typeInfo?.label}
                          </p>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">📐 Surface</p>
                          <p className="text-lg font-bold text-blue-400">{item.surface} m²</p>
                        </div>
                        <div className="bg-gray-900/50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">💵 Prix/m²</p>
                          <p className="text-sm text-green-400">{parseFloat(item.prixUnitaire || 0).toLocaleString()} {currency}</p>
                        </div>
                        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-lg p-3 border border-orange-500/50">
                          <p className="text-xs text-orange-300 mb-1">💰 Coût total</p>
                          <p className="text-lg font-extrabold text-orange-400">
                            {parseFloat(item.total).toLocaleString()} {currency}
                          </p>
                        </div>
                      </div>

                      {item.couches && (
                        <div className="bg-gray-900/30 rounded-lg p-2 text-xs text-gray-400">
                          <p>🖌️ Nombre de couches: {item.couches}</p>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => handleDelete(item.id)} 
                      className="p-3 bg-red-600/80 hover:bg-red-600 rounded-xl text-white font-bold transition-all transform hover:scale-110"
                    >
                      ✖
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Informations additionnelles */}
      <div className="mt-6 bg-gray-800/30 rounded-lg p-4 border border-gray-700">
        <h4 className="font-semibold text-orange-400 mb-2 flex items-center gap-2">
          💡 Informations utiles
        </h4>
        <div className="text-sm text-gray-400 space-y-1">
          {typeFinition === "peinture" && (
            <>
              <p>• Prévoir 10% de surface supplémentaire pour les pertes</p>
              <p>• Rendement moyen : 10-12 m²/litre pour 2 couches</p>
            </>
          )}
          {typeFinition === "carrelage" && (
            <>
              <p>• Prévoir 5-10% de carreaux supplémentaires pour les découpes</p>
              <p>• Colle et joints non inclus dans le prix</p>
            </>
          )}
          {typeFinition === "parquet" && (
            <>
              <p>• Prévoir 7-10% de lames supplémentaires</p>
              <p>• Sous-couche acoustique recommandée</p>
            </>
          )}
          {typeFinition === "platre" && (
            <>
              <p>• Rendement : environ 1 kg/m² par mm d'épaisseur</p>
              <p>• Temps de séchage : 24-48h selon conditions</p>
            </>
          )}
          {typeFinition === "faience" && (
            <>
              <p>• Prévoir 5-10% de carreaux supplémentaires</p>
              <p>• Particulièrement adapté aux pièces humides</p>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        @keyframes fadeinout {
          0%, 100% { opacity: 0; }
          10%, 90% { opacity: 1; }
        }
        .animate-fadeinout {
          animation: fadeinout 2.5s ease forwards;
        }
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