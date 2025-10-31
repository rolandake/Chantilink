// src/Calculs/tp/forms/Signalisation.jsx
import React, { useState, useEffect } from "react";
import { FaTrafficLight, FaRoad, FaShieldAlt, FaMapMarkerAlt } from "react-icons/fa";
import { MdOutlineSignpost, MdOutlineBorderHorizontal } from "react-icons/md";
import { BsFillExclamationTriangleFill } from "react-icons/bs";

export default function Signalisation({ currency = "FCFA", onCostChange = () => {} }) {
  const equipementsOptions = [
    { label: "Panneaux de signalisation", icon: MdOutlineSignpost, color: "orange", emoji: "🚸" },
    { label: "Feux tricolores", icon: FaTrafficLight, color: "red", emoji: "🚦" },
    { label: "Barrières de sécurité", icon: FaShieldAlt, color: "blue", emoji: "🛡️" },
    { label: "Marquage au sol", icon: MdOutlineBorderHorizontal, color: "yellow", emoji: "⚠️" },
    { label: "Glissières de sécurité", icon: FaRoad, color: "green", emoji: "🛣️" },
    { label: "Bornes kilométriques", icon: FaMapMarkerAlt, color: "pink", emoji: "📍" },
    { label: "Autres", icon: BsFillExclamationTriangleFill, color: "gray", emoji: "🔧" },
  
  ];

  const [selectedEquipement, setSelectedEquipement] = useState("");
  const [fields, setFields] = useState({});
  const [totalCost, setTotalCost] = useState(0);

  // Calcul automatique pour tous sauf Electrification
  useEffect(() => {
    if (selectedEquipement !== "Electrification") {
      const total = (parseFloat(fields.coutUnitaire) || 0) * (parseFloat(fields.quantite) || 0);
      setTotalCost(total);
      onCostChange(total);
    }
  }, [fields, selectedEquipement]);

  const handleChange = (name, value) => {
    setFields((prev) => ({ ...prev, [name]: value }));
  };

  const currentEquipment = equipementsOptions.find((e) => e.label === selectedEquipement);

  const renderForm = () => {
    if (!selectedEquipement) return <p className="text-center text-gray-400 py-8">👆 Choisissez un équipement</p>;

    if (selectedEquipement === "Electrification") {
      return <Electrification currency={currency} onCostChange={setTotalCost} />;
    }

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
      case "Glissières de sécurité":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block mb-1 font-semibold text-orange-400 text-sm">Longueur totale (m)</label>
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
        <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-5 shadow-lg border border-orange-500/30">
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

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}