import React, { useState, useEffect, useCallback, useRef } from 'react';

import Murs from "./Murs.jsx";
import Poteaux from "./Poteaux.jsx";
import Longrines from "./Longrines.jsx";
import Linteaux from "./Linteaux.jsx";
import Poutres from "./Poutres.jsx";
import Dalles from "./Dalles.jsx";
import Escaliers from "./Escaliers.jsx";

export default function Elevations({ currency = "XOF", onTotalChange = () => {}, onMateriauxChange = () => {} }) {
  const [selectedOuvrage, setSelectedOuvrage] = useState(null);
  const [totaux, setTotaux] = useState({
    murs: 0, poteaux: 0, longrines: 0, linteaux: 0, poutres: 0, dalles: 0, escaliers: 0
  });
  const [materiaux, setMateriaux] = useState({
    murs: {}, poteaux: {}, longrines: {}, linteaux: {}, poutres: {}, dalles: {}, escaliers: {}
  });

  // ✅ CORRECTION: Refs pour éviter les boucles infinies
  const onTotalChangeRef = useRef(onTotalChange);
  const onMateriauxChangeRef = useRef(onMateriauxChange);
  const previousTotalRef = useRef(0);
  const previousMateriauxRef = useRef({});

  // ✅ Mettre à jour les refs quand les callbacks changent
  useEffect(() => {
    onTotalChangeRef.current = onTotalChange;
  }, [onTotalChange]);

  useEffect(() => {
    onMateriauxChangeRef.current = onMateriauxChange;
  }, [onMateriauxChange]);

  const totalGlobal = Object.values(totaux).reduce((a, b) => a + b, 0);

  // ✅ CORRECTION: N'appeler onTotalChange QUE si la valeur a changé
  useEffect(() => {
    if (totalGlobal !== previousTotalRef.current) {
      console.log('[Elevations] Total changed:', totalGlobal);
      previousTotalRef.current = totalGlobal;
      onTotalChangeRef.current(totalGlobal);
    }
  }, [totalGlobal]);
  
  // ✅ CORRECTION: N'appeler onMateriauxChange QUE si les matériaux ont changé
  useEffect(() => {
    const totalMat = {};
    Object.values(materiaux).forEach(section => {
      for (const [key, val] of Object.entries(section)) {
        totalMat[key] = (totalMat[key] || 0) + val;
      }
    });

    // Comparer avec la version précédente
    const hasChanged = JSON.stringify(totalMat) !== JSON.stringify(previousMateriauxRef.current);
    
    if (hasChanged) {
      console.log('[Elevations] Matériaux changed:', totalMat);
      previousMateriauxRef.current = totalMat;
      onMateriauxChangeRef.current(totalMat);
    }
  }, [materiaux]);

  // ✅ CORRECTION: Handlers stabilisés avec useCallback
  const handleTotalChange = useCallback((key, value) => {
    setTotaux(prev => {
      // Ne mettre à jour que si la valeur a changé
      if (prev[key] === value) return prev;
      return { ...prev, [key]: value };
    });
  }, []);

  const handleMateriauxChange = useCallback((key, data) => {
    setMateriaux(prev => {
      // Ne mettre à jour que si les données ont changé
      if (JSON.stringify(prev[key]) === JSON.stringify(data)) return prev;
      return { ...prev, [key]: data };
    });
  }, []);

  const ouvrages = [
    { key: "murs", label: "Murs", icon: "🧱", color: "bg-gradient-to-r from-red-500 to-orange-500" },
    { key: "poteaux", label: "Poteaux", icon: "🏛️", color: "bg-gradient-to-r from-blue-500 to-cyan-500" },
    { key: "longrines", label: "Longrines", icon: "📏", color: "bg-gradient-to-r from-purple-500 to-pink-500" },
    { key: "linteaux", label: "Linteaux", icon: "🔲", color: "bg-gradient-to-r from-green-500 to-emerald-500" },
    { key: "poutres", label: "Poutres", icon: "➖", color: "bg-gradient-to-r from-yellow-500 to-amber-500" },
    { key: "dalles", label: "Dalles", icon: "▭", color: "bg-gradient-to-r from-indigo-500 to-blue-500" },
    { key: "escaliers", label: "Escaliers", icon: "🪜", color: "bg-gradient-to-r from-rose-500 to-red-500" },
  ];

  // Ajouter le component à chaque ouvrage
  const ouvragesWithComponents = ouvrages.map(ouvrage => ({
    ...ouvrage,
    component: ouvrage.key === "murs" ? Murs :
               ouvrage.key === "poteaux" ? Poteaux :
               ouvrage.key === "longrines" ? Longrines :
               ouvrage.key === "linteaux" ? Linteaux :
               ouvrage.key === "poutres" ? Poutres :
               ouvrage.key === "dalles" ? Dalles :
               ouvrage.key === "escaliers" ? Escaliers : null
  }));

  const ouvragesCompletes = Object.values(totaux).filter(t => t > 0).length;

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 rounded-3xl shadow-2xl text-gray-100 max-w-7xl mx-auto font-sans">
      {/* En-tête moderne */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600 mb-2">
              🏗️ Élévation
            </h2>
            <p className="text-gray-400 text-sm">Choisissez un ouvrage pour commencer les calculs</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 backdrop-blur-sm rounded-2xl px-6 py-4 border border-orange-500/30">
              <div className="text-xs text-gray-400 mb-1">Progression</div>
              <div className="text-2xl font-bold text-orange-400">
                {ouvragesCompletes}/{ouvrages.length}
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-sm rounded-2xl px-6 py-4 border border-blue-500/30">
              <div className="text-xs text-gray-400 mb-1">Total</div>
              <div className="text-2xl font-bold text-blue-400">
                {totalGlobal.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-500 ease-out"
            style={{ width: `${(ouvragesCompletes / ouvrages.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Sélecteur moderne */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          Sélectionner un ouvrage
        </label>
        <select
          className="w-full p-4 rounded-2xl bg-gray-800/80 backdrop-blur-sm border-2 border-gray-700 text-gray-200 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all text-lg font-medium cursor-pointer hover:border-orange-500/50"
          value={selectedOuvrage || ""}
          onChange={(e) => setSelectedOuvrage(e.target.value || null)}
        >
          <option value="">-- Choisir un ouvrage --</option>
          {ouvragesWithComponents.map(({ key, label, icon }) => (
            <option key={key} value={key}>{icon} {label}</option>
          ))}
        </select>
      </div>

      {/* Composant sélectionné */}
      {selectedOuvrage && (() => {
        const ouvrage = ouvragesWithComponents.find(o => o.key === selectedOuvrage);
        const Component = ouvrage.component;
        
        return (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl p-6 mb-6 shadow-2xl border border-gray-700/50 animate-fadeIn">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{ouvrage.icon}</span>
              <h3 className="text-2xl font-bold text-white">{ouvrage.label}</h3>
            </div>
            <Component
              currency={currency}
              onTotalChange={(total) => handleTotalChange(ouvrage.key, total)}
              onMateriauxChange={(data) => handleMateriauxChange(ouvrage.key, data)}
            />
          </div>
        );
      })()}

      {/* Tableau récapitulatif ultra-moderne */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-3xl p-6 shadow-2xl border border-gray-700/50">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="text-orange-400">📊</span>
          Récapitulatif détaillé
        </h3>

        <div className="overflow-hidden rounded-2xl border border-gray-700/50">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-900/50">
                <th className="text-left py-4 px-6 text-gray-400 font-semibold text-sm uppercase tracking-wider">Ouvrage</th>
                <th className="text-right py-4 px-6 text-gray-400 font-semibold text-sm uppercase tracking-wider">Montant</th>
                <th className="text-right py-4 px-6 text-gray-400 font-semibold text-sm uppercase tracking-wider">% du total</th>
                <th className="text-center py-4 px-6 text-gray-400 font-semibold text-sm uppercase tracking-wider">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {ouvragesWithComponents.map(({ key, label, icon, color }) => {
                const montant = totaux[key];
                const pourcentage = totalGlobal > 0 ? (montant / totalGlobal * 100) : 0;
                const hasData = montant > 0;

                return (
                  <tr 
                    key={key}
                    className="hover:bg-gray-700/20 transition-colors group"
                  >
                    <td className="py-5 px-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-2xl shadow-lg ${hasData ? 'opacity-100' : 'opacity-30'}`}>
                          {icon}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-white text-lg group-hover:text-orange-400 transition-colors">
                            {label}
                          </div>
                          {hasData && (
                            <div className="mt-2">
                              <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-full ${color} transition-all duration-500 shadow-sm`}
                                  style={{ width: `${pourcentage}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`font-bold text-xl ${hasData ? 'text-orange-400' : 'text-gray-600'}`}>
                          {montant.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">{currency}</span>
                      </div>
                    </td>
                    <td className="py-5 px-6 text-right">
                      <span className={`text-lg font-bold ${hasData ? 'text-blue-400' : 'text-gray-600'}`}>
                        {pourcentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-5 px-6 text-center">
                      {hasData ? (
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-sm font-bold border border-green-500/30 shadow-sm">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                          Complété
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-4 py-2 bg-gray-700/30 text-gray-500 rounded-full text-sm font-semibold">
                          En attente
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gradient-to-r from-gray-900 to-gray-800 border-t-2 border-orange-500/50">
                <td className="py-6 px-6">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">💰</span>
                    <span className="text-xl font-black text-white uppercase">Total Élévation</span>
                  </div>
                </td>
                <td className="py-6 px-6 text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
                      {totalGlobal.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-400 mt-1">{currency}</span>
                  </div>
                </td>
                <td className="py-6 px-6 text-right">
                  <span className="text-3xl font-black text-blue-400">100%</span>
                </td>
                <td className="py-6 px-6 text-center">
                  <span className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold shadow-lg ${
                    ouvragesCompletes === ouvrages.length
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                      : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                  }`}>
                    {ouvragesCompletes === ouvrages.length ? (
                      <>
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        Tous complétés
                      </>
                    ) : (
                      `${ouvragesCompletes}/${ouvrages.length} complétés`
                    )}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}