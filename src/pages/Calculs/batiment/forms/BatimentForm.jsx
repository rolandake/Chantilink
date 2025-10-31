// ============================================
// 📁 BatimentForm.jsx - Avec CalculationContext (Style TPForm)
// ============================================

import React, { useState, useMemo, useCallback, lazy, Suspense, useEffect } from 'react';
import { useCalculation } from "@/context/CalculationContext";
import Devis from "./Devis";

// ✅ Lazy Loading des composants
const Terrassement = lazy(() => import("./Terrassement"));
const Fondation = lazy(() => import("./Fondation"));
const Elevations = lazy(() => import("./Elevations"));
const Planchers = lazy(() => import("./Planchers"));
const Toiture = lazy(() => import("./Toiture"));
const Finitions = lazy(() => import("./Finitions"));

// Configuration des étapes avec métadonnées
const stepsConfig = [
  { 
    id: "terrassement", 
    label: "Terrassement", 
    component: Terrassement, 
    color: "from-yellow-400 to-orange-500",
    icon: "🏗️"
  },
  { 
    id: "fondation", 
    label: "Fondation", 
    component: Fondation, 
    color: "from-red-400 to-pink-500",
    icon: "🏢"
  },
  { 
    id: "elevation", 
    label: "Élévation", 
    component: Elevations, 
    color: "from-blue-400 to-indigo-500",
    icon: "🧱"
  },
  { 
    id: "planchers", 
    label: "Planchers", 
    component: Planchers, 
    color: "from-green-400 to-teal-500",
    icon: "📐"
  },
  { 
    id: "toiture", 
    label: "Toiture", 
    component: Toiture, 
    color: "from-purple-400 to-pink-500",
    icon: "🏠"
  },
  { 
    id: "finitions", 
    label: "Finitions", 
    component: Finitions, 
    color: "from-orange-400 to-yellow-500",
    icon: "✨"
  },
];

export default function BatimentForm({ currency = "XOF" }) {
  // ✅ Context avec vérification
  const calculationContext = useCalculation();
  
  if (!calculationContext) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-400">❌ Erreur: CalculationContext non disponible</p>
          <p className="text-gray-400 mt-2">Assurez-vous que BatimentForm est encapsulé dans CalculationProvider</p>
        </div>
      </div>
    );
  }

  const {
    currentProjectType = null,
    setCurrentProjectType,
    currentCalculationType = null,
    setCurrentCalculationType,
    fetchSavedCalculations,
    savedCalculations = [],
    loading = false,
    error = null,
    success = null,
    PROJECT_TYPES = {},
  } = calculationContext;

  // ========================================
  // STATE MANAGEMENT
  // ========================================
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState(null);

  // États pour coûts et matériaux
  const initialCosts = useMemo(
    () => Object.fromEntries(stepsConfig.map(s => [s.id, 0])), 
    []
  );
  
  const [costs, setCosts] = useState(initialCosts);
  
  const initialQuantites = useMemo(
    () => Object.fromEntries(stepsConfig.map(s => [s.id, []])), 
    []
  );
  
  const [quantitesParEtape, setQuantitesParEtape] = useState(initialQuantites);

  // ========================================
  // INITIALISATION
  // ========================================
  useEffect(() => {
    if (PROJECT_TYPES && PROJECT_TYPES.BATIMENT) {
      // Définir le type de projet BATIMENT
      if (setCurrentProjectType) {
        setCurrentProjectType(PROJECT_TYPES.BATIMENT);
      }
      if (setCurrentCalculationType) {
        setCurrentCalculationType('projet_complet');
      }

      // Charger les calculs sauvegardés pour BATIMENT
      if (fetchSavedCalculations) {
        fetchSavedCalculations({
          projectType: PROJECT_TYPES.BATIMENT
        });
      }
    }
  }, [setCurrentProjectType, setCurrentCalculationType, fetchSavedCalculations, PROJECT_TYPES]);

  // ========================================
  // HANDLERS OPTIMISÉS
  // ========================================
  
  const costHandlers = useMemo(() => {
    const handlers = {};
    stepsConfig.forEach(({ id }) => {
      handlers[id] = (value) => {
        setCosts(prev => {
          const newValue = Math.max(0, Number(value) || 0);
          if (prev[id] === newValue) return prev;
          return { ...prev, [id]: newValue };
        });
      };
    });
    return handlers;
  }, []);

  const handleQuantitesChange = useCallback((section, materiaux) => {
    setQuantitesParEtape(prev => {
      if (JSON.stringify(prev[section]) === JSON.stringify(materiaux)) {
        return prev;
      }
      return { ...prev, [section]: materiaux };
    });
  }, []);

  // ========================================
  // CALCULS DÉRIVÉS
  // ========================================
  
  const totalGeneral = useMemo(
    () => Object.values(costs).reduce((acc, val) => acc + val, 0), 
    [costs]
  );

  const projectStats = useMemo(() => {
    const activeSteps = stepsConfig.filter(({ id }) => costs[id] > 0);
    const avgCostPerStep = activeSteps.length > 0 
      ? totalGeneral / activeSteps.length 
      : 0;

    return {
      totalSteps: stepsConfig.length,
      activeSteps: activeSteps.length,
      avgCostPerStep,
      completionRate: (activeSteps.length / stepsConfig.length * 100).toFixed(0)
    };
  }, [costs, totalGeneral]);

  // ========================================
  // COMPOSANT RENDERER
  // ========================================
  
  const StepRenderer = useCallback(({ step }) => {
    const StepComponent = step.component;
    return (
      <Suspense 
        fallback={
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-400"></div>
            <p className="text-gray-400 mt-4">Chargement de {step.label}...</p>
          </div>
        }
      >
        <StepComponent
          currency={currency}
          onTotalChange={costHandlers[step.id]}
          onCostChange={costHandlers[step.id]}
          onMateriauxChange={(mats) => handleQuantitesChange(step.id, mats)}
        />
      </Suspense>
    );
  }, [currency, costHandlers, handleQuantitesChange]);

  // ========================================
  // HANDLERS UI
  // ========================================
  
  const toggleMenu = useCallback(() => setMenuOpen(prev => !prev), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  
  const selectStep = useCallback((stepId) => {
    setSelectedStep(stepId);
    setMenuOpen(false);
  }, []);

  const showAllSteps = useCallback(() => {
    setSelectedStep(null);
    setMenuOpen(false);
  }, []);

  // ========================================
  // RENDER
  // ========================================
  
  return (
    <div className="relative min-h-screen bg-gray-900 text-white font-sans">
      {/* Messages globaux */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {error}
        </div>
      )}
      {success && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {success}
        </div>
      )}

      {/* Menu Burger */}
      <button
        className={`fixed top-4 left-4 z-50 p-2 rounded-md bg-gray-800/90 backdrop-blur-sm hover:bg-gray-700 transition-all duration-300 ${
          menuOpen ? "rotate-90" : ""
        } shadow-lg hover:shadow-orange-500/60`}
        onClick={toggleMenu}
        aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={menuOpen}
      >
        <svg 
          className="w-8 h-8" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="orange" 
          strokeWidth="3" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Menu Latéral */}
      {menuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-md z-40" 
            onClick={closeMenu}
            aria-hidden="true"
          />
          
          <aside className="fixed top-0 left-0 h-full w-72 bg-gray-800/95 backdrop-blur-lg p-6 z-50 shadow-2xl animate-slide-in space-y-4 rounded-r-2xl overflow-y-auto">
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-indigo-500 mb-6">
              Navigation Bâtiment
            </h2>

            {/* Statistiques projet */}
            <div className="bg-gray-700/50 rounded-xl p-4 mb-4 text-sm">
              <p className="text-gray-300">
                📊 Progression : <strong className="text-orange-400">{projectStats.completionRate}%</strong>
              </p>
              <p className="text-gray-300">
                ✅ Étapes actives : <strong>{projectStats.activeSteps}/{projectStats.totalSteps}</strong>
              </p>
              <p className="text-gray-300">
                💾 Calculs sauvegardés : <strong>{savedCalculations.length}</strong>
              </p>
            </div>

            <button
              className={`w-full text-left py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                selectedStep === null
                  ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg'
                  : 'text-orange-400 hover:bg-gray-700 hover:scale-105'
              }`}
              onClick={showAllSteps}
            >
              🏗️ Tout afficher
            </button>

            {stepsConfig.map(({ id, label, color, icon }) => (
              <button
                key={id}
                className={`w-full text-left py-3 px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-between ${
                  selectedStep === id
                    ? `bg-gradient-to-r ${color} text-white shadow-lg scale-105`
                    : `text-gray-200 hover:bg-gradient-to-r hover:${color} hover:text-white hover:scale-105`
                }`}
                onClick={() => selectStep(id)}
                aria-current={selectedStep === id ? "step" : undefined}
              >
                <span>{icon} {label}</span>
                {costs[id] > 0 && (
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                    {(costs[id] / 1000).toFixed(0)}k
                  </span>
                )}
              </button>
            ))}
          </aside>
        </>
      )}

      {/* Contenu Principal */}
      <main className="max-w-5xl mx-auto p-6 space-y-12">
        <header className="text-center mt-8 mb-12">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-indigo-500 mb-4 animate-pulse">
            🏢 Calculs du Projet Bâtiment
          </h1>
          <p className="text-gray-400 text-lg">
            {selectedStep 
              ? `Étape : ${stepsConfig.find(s => s.id === selectedStep)?.label}` 
              : 'Vue complète du projet'}
          </p>
        </header>

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-400"></div>
            <p className="text-gray-400 mt-4">Chargement...</p>
          </div>
        )}

        <div className="space-y-12 mt-6">
          {(selectedStep === null 
            ? stepsConfig 
            : stepsConfig.filter(s => s.id === selectedStep)
          ).map(step => (
            <div key={step.id} className="scroll-mt-20" id={step.id}>
              <StepRenderer step={step} />
            </div>
          ))}
        </div>

        {/* Totaux Sticky */}
        <div className="sticky bottom-4 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-2xl p-6 shadow-2xl border-2 border-green-400 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-lg font-semibold mb-2">💰 Total Général du Projet Bâtiment</p>
            <p className="text-4xl font-extrabold animate-pulse">
              {totalGeneral.toLocaleString('fr-FR')} {currency}
            </p>
          </div>
          
          {projectStats.activeSteps > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {stepsConfig.map(({ id, label, icon }) => costs[id] > 0 && (
                <div key={id} className="bg-white/10 rounded-lg px-3 py-2 hover:bg-white/20 transition">
                  <span className="font-semibold">{icon} {label}:</span>
                  <br />
                  <span className="text-yellow-300 font-bold">
                    {costs[id].toLocaleString('fr-FR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Devis Interactif */}
        <Devis
          currency={currency}
          total={totalGeneral}
          details={costs}
          quantitesParEtape={quantitesParEtape}
        />
      </main>

      <style>{`
        @keyframes slide-in { 
          from { transform: translateX(-100%); opacity: 0; } 
          to { transform: translateX(0); opacity: 1; } 
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in { 
          animation: slide-in 0.3s ease-out forwards; 
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        
        html {
          scroll-behavior: smooth;
        }
        
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #1f2937;
        }
        ::-webkit-scrollbar-thumb {
          background: #fb923c;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #f97316;
        }
      `}</style>
    </div>
  );
}