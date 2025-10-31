// ============================================
// 📁 BuseForm.jsx
// Composant formulaire de calcul de buses synchronisé
// ============================================

import React, { useState, useEffect } from "react";
import { useCalculator } from "../../../../shared/hooks/useCalculator.js";
import { BuseCalculator, BUSE_CONSTANTS } from "@/domains/tp/calculators/BuseCalculator.js";

const STORAGE_KEY = "buse-history";

export default function BuseForm({ 
  currency = "FCFA",
  onCostChange = () => {},
  onMateriauxChange = () => {}
}) {
  // Hook calculateur
  const { inputs, results, updateInput, isValid } = useCalculator(
    BuseCalculator,
    "buse",
    "tp"
  );

  const [historique, setHistorique] = useState([]);
  const [message, setMessage] = useState("");
  const [showHydraulique, setShowHydraulique] = useState(false);
  const [showMateriaux, setShowMateriaux] = useState(false);

  // ========================================
  // GESTION HISTORIQUE (localStorage)
  // ========================================
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistorique(JSON.parse(saved));
      } catch (e) {
        console.error("Erreur chargement historique:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (historique.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(historique));
    }
  }, [historique]);

  // ========================================
  // NOTIFICATION AU PARENT
  // ========================================
  useEffect(() => {
    // Notifier le coût total
    onCostChange(results?.total ?? 0);

    // Notifier les matériaux pour le devis
    if (results && isValid) {
      const materiaux = [
        {
          id: 'buse-principal',
          designation: results.description || `Buse Ø${inputs.diametre}m`,
          unite: results.unite || 'ml',
          quantite: results.volume || 0,
          prixUnitaire: parseFloat(inputs.prixUnitaire) || 0,
          montant: results.coutMateriaux || 0,
          metadata: {
            volumeBeton: results.volume,
            quantiteBuses: results.quantite
          }
        }
      ];

      // Ajout détail matériaux si disponible
      if (showMateriaux) {
        materiaux.push(
          {
            id: 'buse-ciment',
            designation: 'Ciment (buses)',
            unite: 't',
            quantite: results.cimentT || 0,
            prixUnitaire: 0,
            montant: 0,
            metadata: { detail: `${results.cimentSacs} sacs` }
          },
          {
            id: 'buse-sable',
            designation: 'Sable (buses)',
            unite: 't',
            quantite: results.sableT || 0,
            prixUnitaire: 0,
            montant: 0
          },
          {
            id: 'buse-gravier',
            designation: 'Gravier (buses)',
            unite: 't',
            quantite: results.gravierT || 0,
            prixUnitaire: 0,
            montant: 0
          },
          {
            id: 'buse-acier',
            designation: 'Acier d\'armature (buses)',
            unite: 't',
            quantite: results.acierT || 0,
            prixUnitaire: 0,
            montant: 0
          }
        );
      }

      onMateriauxChange(materiaux);
    } else {
      onMateriauxChange([]);
    }
  }, [results, inputs, isValid, showMateriaux, onCostChange, onMateriauxChange]);

  // ========================================
  // HANDLERS
  // ========================================
  const handleChange = (field) => (e) => {
    const value = e.target.value;
    updateInput(field, value);
  };

  const showMessage = (msg, type = "success") => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(""), 2500);
  };

  const handleSave = () => {
    if (!isValid || !results?.volume) {
      return alert("⚠️ Veuillez entrer des dimensions valides.");
    }

    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString('fr-FR'),
      ...inputs,
      ...results,
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
      localStorage.removeItem(STORAGE_KEY);
      showMessage("🧹 Historique vidé !");
    }
  };

  // ========================================
  // CALCULS HYDRAULIQUES
  // ========================================
  const calculerHydraulique = () => {
    if (!isValid || !results?.volume) return null;

    const calculator = new BuseCalculator(inputs);
    return calculator.estimerCapaciteHydraulique(1, 0.013); // Pente 1%, Manning 0.013
  };

  const hydraulique = showHydraulique ? calculerHydraulique() : null;

  // ========================================
  // RENDER
  // ========================================
  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-2xl shadow-xl text-gray-100 font-sans relative">
      <h2 className="text-3xl font-extrabold text-blue-400 mb-6 text-center border-b border-gray-700 pb-2">
        💧 Buses Hydrauliques
      </h2>

      {/* Notification Toast */}
      {message && (
        <div className={`fixed top-5 right-5 px-5 py-3 rounded-xl shadow-lg animate-fadeinout z-50 ${
          message.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        } text-white`}>
          {message.text || message}
        </div>
      )}

      {/* Formulaire */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        {[
          { name: "diametre", label: "Diamètre (m)", placeholder: "Ex: 0.8", icon: "⭕", 
            help: `Standards: ${BUSE_CONSTANTS.DIAMETRES_STANDARDS.join(', ')}m` },
          { name: "longueur", label: "Longueur (m)", placeholder: "Ex: 2", icon: "📏",
            help: `Standards: ${BUSE_CONSTANTS.LONGUEURS_STANDARDS.join(', ')}m` },
          { name: "quantite", label: "Quantité", placeholder: "Ex: 5", icon: "🔢" },
          { name: "prixUnitaire", label: `Prix unitaire (${currency}/m³)`, placeholder: "Ex: 85000", icon: "💰" },
          { name: "coutMainOeuvre", label: `Coût main d'œuvre (${currency})`, placeholder: "Ex: 120000", icon: "👷", full: true },
        ].map(({ name, label, placeholder, icon, help, full }) => (
          <div className={full ? "col-span-2" : ""} key={name}>
            <label className="block mb-1 font-semibold text-blue-300">
              {icon} {label}
            </label>
            <input
              type="number"
              step="any"
              min={name === "quantite" ? "1" : "0"}
              value={inputs[name] || ""}
              onChange={handleChange(name)}
              placeholder={placeholder}
              className="w-full px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
              title={help}
            />
            {help && <p className="text-xs text-gray-500 mt-1">{help}</p>}
          </div>
        ))}
      </div>

      {/* Résultats instantanés */}
      <div className="bg-gray-800 rounded-2xl p-6 border-2 border-blue-500/30 mb-6">
        <h3 className="text-xl font-bold text-blue-400 mb-4">📊 Résultats</h3>

        {isValid && results ? (
          <div className="space-y-4">
            {/* Volumes */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Volume béton total</p>
                <p className="text-2xl font-bold">📦 {results.volume?.toFixed(3) ?? 0} m³</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Quantité</p>
                <p className="text-2xl font-bold">🔢 {results.quantite || 1} buse(s)</p>
              </div>
            </div>

            {/* Bouton matériaux */}
            <button
              onClick={() => setShowMateriaux(!showMateriaux)}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold transition text-left"
            >
              {showMateriaux ? '🔼' : '🔽'} Détails matériaux
            </button>

            {/* Détails matériaux */}
            {showMateriaux && (
              <div className="p-4 bg-gray-700 rounded-xl space-y-2 text-sm">
                <p>🧱 <strong>Ciment:</strong> {results.cimentKg?.toFixed(0)} kg ({results.cimentSacs?.toFixed(1)} sacs) = {results.cimentT?.toFixed(3)} t</p>
                <p>🏖️ <strong>Sable:</strong> {results.sableM3?.toFixed(3)} m³ = {results.sableT?.toFixed(3)} t</p>
                <p>🪨 <strong>Gravier:</strong> {results.gravierM3?.toFixed(3)} m³ = {results.gravierT?.toFixed(3)} t</p>
                <p>⚙️ <strong>Acier:</strong> {results.acierKg?.toFixed(1)} kg = {results.acierT?.toFixed(3)} t</p>
              </div>
            )}

            {/* Bouton hydraulique */}
            <button
              onClick={() => setShowHydraulique(!showHydraulique)}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl font-semibold transition text-left"
            >
              {showHydraulique ? '🔼' : '🔽'} Capacité hydraulique
            </button>

            {/* Détails hydrauliques */}
            {showHydraulique && hydraulique && (
              <div className="p-4 bg-blue-900/30 rounded-xl space-y-2 text-sm border border-blue-500/30">
                <p>💧 <strong>Section utile:</strong> {hydraulique.section} m²</p>
                <p>🌊 <strong>Vitesse d'écoulement:</strong> {hydraulique.vitesse} m/s (pente 1%)</p>
                <p>📊 <strong>Débit maximal:</strong> {hydraulique.debit} m³/h ({hydraulique.debitLitres} L/h)</p>
                <p className="text-xs text-gray-400 italic">* Calcul selon formule de Manning (coefficient 0.013)</p>
              </div>
            )}

            {/* Coûts */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-700">
              <div>
                <p className="text-gray-400 text-sm">Coût matériaux</p>
                <p className="text-xl font-semibold text-blue-400">
                  {results.coutMateriaux?.toLocaleString("fr-FR") ?? 0} {currency}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Coût main d'œuvre</p>
                <p className="text-xl font-semibold text-green-400">
                  {results.coutMainOeuvre?.toLocaleString("fr-FR") ?? 0} {currency}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-700">
              <p className="text-gray-400 text-sm">Total Buses</p>
              <p className="text-3xl font-extrabold text-blue-400">
                💰 {results.total?.toLocaleString("fr-FR") ?? 0} {currency}
              </p>
              {results.quantite > 1 && (
                <p className="text-sm text-gray-400 mt-1">
                  ({results.coutParBuse?.toLocaleString("fr-FR")} {currency} / buse)
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">
            Entrez les dimensions pour voir les résultats
          </p>
        )}
      </div>

      {/* Boutons d'action */}
      <div className="flex flex-wrap justify-center gap-4 mb-8">
        <button
          onClick={handleSave}
          disabled={!isValid}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-2xl font-bold shadow-md transition"
        >
          💾 Sauvegarder
        </button>
        <button
          onClick={clearHistorique}
          disabled={historique.length === 0}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-2xl font-bold shadow-md transition"
        >
          🧹 Vider l'historique
        </button>
      </div>

      {/* Historique */}
      {historique.length > 0 && (
        <section className="max-h-80 overflow-y-auto bg-gray-800 rounded-2xl p-4 shadow-inner border border-gray-700 space-y-3">
          <h3 className="text-xl font-bold text-blue-400 mb-3 text-center sticky top-0 bg-gray-800 pb-2">
            🕓 Historique ({historique.length})
          </h3>
          {historique.map(item => (
            <div
              key={item.id}
              className="bg-gray-700 rounded-xl p-4 flex justify-between items-start text-sm text-gray-100 hover:bg-gray-600 transition"
            >
              <div className="space-y-1 max-w-[85%]">
                <time className="block text-xs text-gray-400">{item.date}</time>
                <p className="font-semibold text-blue-300">{item.description || `Buse Ø${item.diametre}m`}</p>
                <p>📐 Dimensions : Ø{item.diametre}m × {item.longueur}m × {item.quantite}</p>
                <p>📦 Volume : {item.volume?.toFixed(3) ?? 0} m³</p>
                <p>🧱 Ciment : {item.cimentT?.toFixed(3)} t ({item.cimentSacs?.toFixed(1)} sacs)</p>
                <p>🏖️ Sable : {item.sableT?.toFixed(3)} t | 🪨 Gravier : {item.gravierT?.toFixed(3)} t</p>
                <p>⚙️ Acier : {item.acierT?.toFixed(3)} t</p>
                <p className="font-bold text-blue-300">
                  💰 Total : {item.total?.toLocaleString("fr-FR") ?? 0} {currency}
                </p>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="ml-2 px-3 py-1 bg-red-600 hover:bg-red-700 rounded-2xl text-white font-bold text-xs transition"
                aria-label="Supprimer"
              >
                ✖
              </button>
            </div>
          ))}
        </section>
      )}

      <style>{`
        @keyframes fadeinout {
          0%, 100% { opacity: 0; transform: translateY(-10px); }
          10%, 90% { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeinout { animation: fadeinout 2.5s ease forwards; }
      `}</style>
    </div>
  );
}