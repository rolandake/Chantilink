import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEYS = {
  forme: "chaussee-forme-history",
  base: "chaussee-base-history",
  roulement: "chaussee-roulement-history",
  fondation: "chaussee-fondation-history",
};

const COUCHES = [
  { key: "forme", label: "Couche de forme", icon: "🏗️", color: "orange", type: "m3" },
  { key: "base", label: "Couche de base", icon: "🔷", color: "purple", type: "m3" },
  { key: "roulement", label: "Couche de roulement", icon: "🛣️", color: "yellow", type: "m2" },
  { key: "fondation", label: "Couche de fondation", icon: "⚡", color: "green", type: "m3" },
];

const defaultFields = [
  { name: "longueur", label: "Longueur (m)" },
  { name: "largeur", label: "Largeur (m)" },
  { name: "epaisseur", label: "Épaisseur (m)" },
  { name: "prixUnitaire", label: "Prix unitaire", suffix: "€/m³" },
  { name: "coutMainOeuvre", label: "Coût main d'œuvre", suffix: "€", full: true },
];

function CoucheForm({ currency, onTotalChange, type, coucheKey }) {
  const [fields, setFields] = useState(() =>
    Object.fromEntries(defaultFields.map(f => [f.name, ""]))
  );
  const [historique, setHistorique] = useState([]);
  const [message, setMessage] = useState("");

  const storageKey = STORAGE_KEYS[coucheKey];

  const handleChange = useCallback((name) => (e) => {
    const value = e.target.value;
    setFields(prev => ({ ...prev, [name]: value }));
  }, []);

  const volume = useMemo(() => {
    const l = parseFloat(fields.longueur) || 0;
    const w = parseFloat(fields.largeur) || 0;
    const h = parseFloat(fields.epaisseur) || 0;
    return type === "m2" ? l * w : l * w * h;
  }, [fields, type]);

  const total = useMemo(() => {
    const prix = parseFloat(fields.prixUnitaire) || 0;
    const mo = parseFloat(fields.coutMainOeuvre) || 0;
    return volume * prix + mo;
  }, [volume, fields]);

  useEffect(() => onTotalChange(total), [total, onTotalChange]);

  // Historique
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { setHistorique(JSON.parse(saved)); } catch {}
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(historique));
  }, [historique, storageKey]);

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 2500);
  };

  const handleSave = () => {
    if (volume === 0) return alert("⚠️ Veuillez entrer des dimensions valides.");
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      ...fields,
      volume: volume.toFixed(3),
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
    <div>
      {message && (
        <div className="fixed top-5 right-5 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg animate-fadeinout z-50">
          {message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-6">
        {defaultFields.map((f, idx) => (
          <div key={idx} className={f.full ? "col-span-2" : ""}>
            <label className="block mb-1 font-semibold text-orange-400 text-sm">
              {f.label} {f.suffix || `(${currency})`}
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={fields[f.name]}
              onInput={handleChange(f.name)}
              className={`w-full rounded-md px-3 py-2 border border-gray-700 focus:ring-2 focus:ring-orange-400 transition ${
                fields[f.name] <= 0 ? "bg-red-800/30" : "bg-gray-800"
              }`}
              placeholder="0"
            />
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-5 shadow-lg border border-orange-500/30 mb-4">
        <div className="text-center mb-4">
          <p className="text-sm text-gray-400">Volume / Surface</p>
          <p className="text-4xl font-bold text-orange-400">{volume.toFixed(3)} {type}</p>
        </div>
        <div className="border-t border-gray-600 pt-4 mt-4">
          <p className="text-center text-3xl font-extrabold text-orange-400 animate-pulse">
            💰 Total : {total.toLocaleString()} {currency}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4 mb-6">
        <button 
          onClick={handleSave} 
          disabled={volume === 0}
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

      {historique.length > 0 && (
        <section className="bg-gradient-to-br from-gray-800 via-gray-850 to-gray-900 rounded-2xl p-6 shadow-2xl border border-orange-500/30">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-700">
            <h3 className="text-2xl font-extrabold text-orange-400 flex items-center gap-3">
              <span className="text-3xl">🕓</span>
              Historique
            </h3>
            <span className="bg-orange-500/20 text-orange-400 px-4 py-2 rounded-lg font-bold">
              {historique.length} entrée{historique.length > 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {historique.map((item, index) => (
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
                        <p className="text-xs text-gray-500 mb-1">📐 Dimensions</p>
                        <p className="text-sm font-semibold text-gray-200">
                          {item.longueur} × {item.largeur} × {item.epaisseur} m
                        </p>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">📦 Volume/Surface</p>
                        <p className="text-lg font-bold text-orange-400">{item.volume} {type}</p>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">💵 Prix unitaire</p>
                        <p className="text-sm text-blue-400">{parseFloat(item.prixUnitaire || 0).toLocaleString()} {currency}</p>
                      </div>
                      <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-lg p-3 border border-orange-500/50">
                        <p className="text-xs text-orange-300 mb-1">💰 Coût total</p>
                        <p className="text-lg font-extrabold text-orange-400">
                          {parseFloat(item.total).toLocaleString()} {currency}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleDelete(item.id)} 
                    className="p-3 bg-red-600/80 hover:bg-red-600 rounded-xl text-white font-bold transition-all transform hover:scale-110"
                  >
                    ✖
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function Chaussee({ currency = "FCFA", onCostChange = () => {} }) {
  const [activeCouche, setActiveCouche] = useState("forme");
  const [costs, setCosts] = useState(
    Object.fromEntries(COUCHES.map(c => [c.key, 0]))
  );

  const total = useMemo(() => Object.values(costs).reduce((a, b) => a + b, 0), [costs]);

  useEffect(() => onCostChange(total), [total, onCostChange]);

  const handleLayerCostChange = useCallback((layer) => (value) => {
    setCosts(prev => {
      const newValue = Math.max(0, Number(value) || 0);
      if (prev[layer] === newValue) return prev;
      return { ...prev, [layer]: newValue };
    });
  }, []);

  const currentCouche = useMemo(() => COUCHES.find(c => c.key === activeCouche), [activeCouche]);

  return (
    <div className="p-6 bg-gray-900 rounded-xl shadow-xl text-gray-100 max-w-4xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center animate-pulse">
        🛣️ Chaussée
      </h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {COUCHES.map(c => (
          <button
            key={c.key}
            onClick={() => setActiveCouche(c.key)}
            className={`p-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
              activeCouche === c.key
                ? `bg-${c.color}-500 text-white shadow-lg scale-105`
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            <div className="text-2xl mb-1">{c.icon}</div>
            <div className="text-xs">{c.label}</div>
            <div className="text-sm font-bold mt-1">{costs[c.key].toLocaleString()} {currency}</div>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeCouche}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="mb-6 bg-gray-800/50 p-5 rounded-xl shadow-inner backdrop-blur-sm"
        >
          <h3 className="text-xl font-bold text-center mb-4 flex items-center justify-center gap-2">
            <span className="text-2xl">{currentCouche?.icon}</span>
            <span className="text-orange-400">{currentCouche?.label}</span>
          </h3>
          <CoucheForm 
            currency={currency} 
            onTotalChange={handleLayerCostChange(activeCouche)}
            type={currentCouche?.type}
            coucheKey={activeCouche}
          />
        </motion.div>
      </AnimatePresence>

      <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-6 shadow-lg border border-orange-500/30">
        <h3 className="text-center text-lg font-semibold text-gray-400 mb-4">📊 Récapitulatif des coûts</h3>
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          {COUCHES.map(c => (
            <div key={c.key} className="bg-gray-900/50 p-3 rounded flex justify-between items-center">
              <span className="text-gray-400">{c.icon} {c.label}</span>
              <span className="font-bold text-green-400">{costs[c.key].toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-600 pt-4">
          <p className="text-center text-3xl font-extrabold text-orange-400 animate-pulse">
            💰 Total Chaussée : {total.toLocaleString()} {currency}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
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