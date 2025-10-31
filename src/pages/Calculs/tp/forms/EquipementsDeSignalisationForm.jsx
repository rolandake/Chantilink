import React, { useState, useEffect } from "react";

const STORAGE_KEY = "signalisation-history";

export default function Signalisation({ currency = "FCFA", onCostChange = () => {} }) {
  const equipementsOptions = [
    { label: "Panneaux de signalisation", emoji: "🚸", color: "orange" },
    { label: "Feux tricolores", emoji: "🚦", color: "red" },
    { label: "Barrières de sécurité", emoji: "🛡️", color: "blue" },
    { label: "Marquage au sol", emoji: "⚠️", color: "yellow" },
    { label: "Glissières de sécurité", emoji: "🛣️", color: "green" },
    { label: "Bornes kilométriques", emoji: "📍", color: "pink" },
    { label: "Autres", emoji: "🔧", color: "gray" },
  ];

  const [selectedEquipement, setSelectedEquipement] = useState("");
  const [fields, setFields] = useState({});
  const [totalCost, setTotalCost] = useState(0);
  const [historique, setHistorique] = useState([]);
  const [message, setMessage] = useState("");

  // Calcul automatique
  useEffect(() => {
    const total = (parseFloat(fields.coutUnitaire) || 0) * (parseFloat(fields.quantite) || 0);
    setTotalCost(total);
    onCostChange(total);
  }, [fields]);

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

  const handleChange = (name, value) => {
    setFields((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (!selectedEquipement || totalCost === 0) return alert("⚠️ Veuillez remplir les champs valides.");
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      equipement: selectedEquipement,
      ...fields,
      total: totalCost.toFixed(2),
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

  const currentEquipment = equipementsOptions.find((e) => e.label === selectedEquipement);

  const renderForm = () => {
    if (!selectedEquipement) return <p className="text-center text-gray-400 py-8">👆 Choisissez un équipement</p>;

    const commonFields = (
      <>
        <div>
          <label className="block mb-1 font-semibold text-orange-400 text-sm">Quantité</label>
          <input
            type="number"
            min="0"
            step="any"
            value={fields.quantite || ""}
            onInput={(e) => handleChange("quantite", e.target.value)}
            className={`w-full rounded-md px-3 py-2 border border-gray-700 focus:ring-2 focus:ring-orange-400 transition ${
              !fields.quantite ? "bg-red-800/30" : "bg-gray-800"
            }`}
            placeholder="0"
          />
        </div>
        <div>
          <label className="block mb-1 font-semibold text-orange-400 text-sm">Coût unitaire ({currency})</label>
          <input
            type="number"
            min="0"
            step="any"
            value={fields.coutUnitaire || ""}
            onInput={(e) => handleChange("coutUnitaire", e.target.value)}
            className={`w-full rounded-md px-3 py-2 border border-gray-700 focus:ring-2 focus:ring-orange-400 transition ${
              !fields.coutUnitaire ? "bg-red-800/30" : "bg-gray-800"
            }`}
            placeholder="0"
          />
        </div>
      </>
    );

    switch (selectedEquipement) {
      case "Panneaux de signalisation":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block mb-1 font-semibold text-orange-400 text-sm">Dimensions (cm)</label>
              <input
                type="text"
                value={fields.dimension || ""}
                onInput={(e) => handleChange("dimension", e.target.value)}
                className="w-full rounded-md px-3 py-2 border border-gray-700 focus:ring-2 focus:ring-orange-400 bg-gray-800"
                placeholder="Ex: 80x80"
              />
            </div>
            {commonFields}
          </div>
        );
      case "Feux tricolores":
        return (
          <div className="grid grid-cols-2 gap-4">
            {commonFields}
            <div className="col-span-2">
              <label className="block mb-1 font-semibold text-orange-400 text-sm">Détails techniques</label>
              <input
                type="text"
                value={fields.details || ""}
                onInput={(e) => handleChange("details", e.target.value)}
                className="w-full rounded-md px-3 py-2 border border-gray-700 focus:ring-2 focus:ring-orange-400 bg-gray-800"
                placeholder="Ex: LED, solaire"
              />
            </div>
          </div>
        );
      case "Barrières de sécurité":
      case "Glissières de sécurité":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block mb-1 font-semibold text-orange-400 text-sm">Longueur (m)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={fields.longueur || ""}
                onInput={(e) => handleChange("longueur", e.target.value)}
                className="w-full rounded-md px-3 py-2 border border-gray-700 focus:ring-2 focus:ring-orange-400 bg-gray-800"
                placeholder="0"
              />
            </div>
            {commonFields}
          </div>
        );
      case "Marquage au sol":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block mb-1 font-semibold text-orange-400 text-sm">Surface (m²)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={fields.surface || ""}
                onInput={(e) => handleChange("surface", e.target.value)}
                className="w-full rounded-md px-3 py-2 border border-gray-700 focus:ring-2 focus:ring-orange-400 bg-gray-800"
                placeholder="0"
              />
            </div>
            {commonFields}
          </div>
        );
      case "Bornes kilométriques":
      case "Autres":
        return (
          <div className="grid grid-cols-2 gap-4">
            {selectedEquipement === "Autres" && (
              <div className="col-span-2">
                <label className="block mb-1 font-semibold text-orange-400 text-sm">Description</label>
                <input
                  type="text"
                  value={fields.description || ""}
                  onInput={(e) => handleChange("description", e.target.value)}
                  className="w-full rounded-md px-3 py-2 border border-gray-700 focus:ring-2 focus:ring-orange-400 bg-gray-800"
                  placeholder="Décrivez l'équipement"
                />
              </div>
            )}
            {commonFields}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-xl shadow-lg text-gray-100 font-sans animate-fade-in">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center animate-pulse">
        🚧 Équipements de signalisation
      </h2>

      {message && (
        <div className="fixed top-5 right-5 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg animate-fadeinout z-50">
          {message}
        </div>
      )}

      {/* Sélection par boutons visuels */}
      <div className="mb-8">
        <label className="block mb-3 font-semibold text-orange-400 text-lg">
          Type d'équipement
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {equipementsOptions.map((equip) => (
            <button
              key={equip.label}
              onClick={() => {
                setSelectedEquipement(equip.label);
                setFields({});
              }}
              className={`p-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                selectedEquipement === equip.label
                  ? "bg-orange-500 text-white shadow-lg scale-105"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              <div className="text-2xl mb-1">{equip.emoji}</div>
              <div className="text-xs leading-tight">{equip.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Formulaire dynamique */}
      <div className="bg-gray-800/50 rounded-xl p-5 mb-6 backdrop-blur-sm">
        {currentEquipment && (
          <h3 className="text-lg font-bold text-center mb-4 flex items-center justify-center gap-2">
            <span className="text-2xl">{currentEquipment.emoji}</span>
            <span className="text-orange-400">{currentEquipment.label}</span>
          </h3>
        )}
        {renderForm()}
      </div>

      {/* Résultats */}
      {selectedEquipement && (
        <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-5 shadow-lg border border-orange-500/30 mb-6">
          <div className="text-center mb-4">
            <p className="text-sm text-gray-400">Type d'équipement</p>
            <p className="text-2xl font-bold text-orange-400">{currentEquipment?.emoji} {selectedEquipement}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            <div className="bg-gray-900/50 p-3 rounded">
              <p className="text-gray-400">📦 Quantité</p>
              <p className="text-xl font-bold text-green-400">{fields.quantite || 0}</p>
            </div>

            <div className="bg-gray-900/50 p-3 rounded">
              <p className="text-gray-400">💵 Prix unitaire</p>
              <p className="text-xl font-bold text-blue-400">{parseFloat(fields.coutUnitaire || 0).toLocaleString()} {currency}</p>
            </div>
          </div>

          <div className="border-t border-gray-600 pt-4 mt-4">
            <p className="text-center text-3xl font-extrabold text-orange-400 animate-pulse">
              💰 Total : {totalCost.toLocaleString()} {currency}
            </p>
          </div>
        </div>
      )}

      {/* Boutons */}
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        <button 
          onClick={handleSave} 
          disabled={!selectedEquipement || totalCost === 0}
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
              Historique Signalisation
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
                        <p className="text-xs text-gray-500 mb-1">🚧 Équipement</p>
                        <p className="text-sm font-semibold text-gray-200">{item.equipement}</p>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">📦 Quantité</p>
                        <p className="text-lg font-bold text-green-400">{item.quantite}</p>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">💵 Prix unitaire</p>
                        <p className="text-sm text-blue-400">{parseFloat(item.coutUnitaire || 0).toLocaleString()} {currency}</p>
                      </div>
                      <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-lg p-3 border border-orange-500/50">
                        <p className="text-xs text-orange-300 mb-1">💰 Coût total</p>
                        <p className="text-lg font-extrabold text-orange-400">
                          {parseFloat(item.total).toLocaleString()} {currency}
                        </p>
                      </div>
                    </div>

                    {/* Détails supplémentaires */}
                    {(item.dimension || item.longueur || item.surface || item.details || item.description) && (
                      <div className="bg-gray-900/30 rounded-lg p-2 text-xs text-gray-400">
                        {item.dimension && <p>📐 Dimensions: {item.dimension}</p>}
                        {item.longueur && <p>📏 Longueur: {item.longueur} m</p>}
                        {item.surface && <p>📐 Surface: {item.surface} m²</p>}
                        {item.details && <p>ℹ️ Détails: {item.details}</p>}
                        {item.description && <p>📝 Description: {item.description}</p>}
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
            ))}
          </div>
        </section>
      )}

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