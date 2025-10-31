// ============================================
// components/CalculationEngine.jsx
// ============================================
import React, { useState, useEffect } from 'react';

function CalculationEngine({ planData, projectType, engineerMode, onCalculationsUpdate }) {
  const [activeModule, setActiveModule] = useState('charges');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);

  const modules = {
    structural: ['charges', 'rdm', 'beton_arme', 'metallique', 'bois'],
    hydraulic: ['debits', 'pertes_charge', 'reseaux', 'assainissement'],
    roads: ['terrassement', 'chaussee', 'signalisation', 'drainage'],
    electrical: ['puissance', 'cables', 'protection', 'eclairage'],
    geotechnical: ['sol', 'fondations', 'stabilite', 'portance']
  };

  const currentModules = modules[engineerMode] || [];

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 space-y-4">
      <h3 className="text-lg font-bold text-indigo-400">🔧 Calculs en temps réel</h3>

      {/* Onglets modules */}
      <div className="flex flex-wrap gap-2">
        {currentModules.map(mod => (
          <button
            key={mod}
            onClick={() => setActiveModule(mod)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
              activeModule === mod
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {mod.replace('_', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      {/* Résultats */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-400">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-2" />
            Calcul en cours...
          </div>
        ) : results[activeModule] ? (
          <div className="space-y-2 text-sm">
            {Object.entries(results[activeModule]).map(([key, val]) => (
              <div key={key} className="flex justify-between p-2 bg-gray-700/50 rounded">
                <span className="text-gray-300">{key}:</span>
                <span className="text-white font-semibold">{val}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-4">
            Sélectionnez un module et uploadez un plan
          </p>
        )}
      </div>
    </div>
  );
}

// ✅ EXPORT PAR DÉFAUT
export default CalculationEngine;

// ============================================
// components/ProjectTimeline.jsx
// ============================================
export function ProjectTimeline({ projectType, phase, calculations }) {
  const phases = [
    { id: 'conception', label: 'Conception', icon: '📐', status: 'completed' },
    { id: 'calculs', label: 'Calculs', icon: '🔧', status: 'active' },
    { id: 'verification', label: 'Vérification', icon: '✅', status: 'pending' },
    { id: 'execution', label: 'Exécution', icon: '🚧', status: 'pending' },
    { id: 'suivi', label: 'Suivi', icon: '📊', status: 'pending' }
  ];

  return (
    <div className="flex-1 bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 overflow-y-auto">
      <h3 className="text-2xl font-bold text-indigo-400 mb-6">📅 Timeline du Projet</h3>

      <div className="space-y-6">
        {phases.map((p, idx) => (
          <div key={p.id} className="relative">
            {idx < phases.length - 1 && (
              <div className="absolute left-6 top-12 w-0.5 h-full bg-gray-700" />
            )}
            
            <div className={`flex items-start gap-4 p-4 rounded-xl transition ${
              p.status === 'active' ? 'bg-indigo-600/20 border-2 border-indigo-500' :
              p.status === 'completed' ? 'bg-green-600/10 border border-green-500/30' :
              'bg-gray-700/30 border border-gray-600/30'
            }`}>
              <div className={`flex-none w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                p.status === 'active' ? 'bg-indigo-600' :
                p.status === 'completed' ? 'bg-green-600' :
                'bg-gray-600'
              }`}>
                {p.icon}
              </div>

              <div className="flex-1">
                <h4 className="text-lg font-bold text-white mb-1">{p.label}</h4>
                <p className="text-sm text-gray-400 mb-2">
                  {p.status === 'completed' && '✓ Phase terminée'}
                  {p.status === 'active' && '🔄 En cours...'}
                  {p.status === 'pending' && '⏳ À venir'}
                </p>

                {p.status === 'active' && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-300">
                      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 w-3/4 transition-all" />
                      </div>
                      <span>75%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// components/TechnicalReports.jsx
// ============================================
export function TechnicalReports({ projectType, planData, calculations }) {
  const [reports, setReports] = useState([
    { 
      id: 1, 
      title: 'Note de calcul - Structure', 
      date: '2025-10-29', 
      pages: 15,
      status: 'generated' 
    },
    { 
      id: 2, 
      title: 'Rapport d\'analyse de plan', 
      date: '2025-10-28', 
      pages: 8,
      status: 'generated' 
    }
  ]);

  return (
    <div className="flex-1 bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-indigo-400">📋 Rapports Techniques</h3>
        <button className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white text-sm font-semibold transition">
          + Nouveau Rapport
        </button>
      </div>

      <div className="space-y-4">
        {reports.map(report => (
          <div key={report.id} className="bg-gray-700/50 rounded-xl p-4 border border-gray-600/50 hover:border-indigo-500/50 transition">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-lg font-bold text-white mb-1">{report.title}</h4>
                <p className="text-sm text-gray-400">
                  {report.pages} pages • {new Date(report.date).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold">
                Généré
              </span>
            </div>

            <div className="flex gap-2">
              <button className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white text-xs transition">
                📄 Voir
              </button>
              <button className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded-lg text-white text-xs transition">
                ⬇️ Télécharger
              </button>
              <button className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded-lg text-white text-xs transition">
                ✉️ Envoyer
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Templates de rapports */}
      <div className="mt-8">
        <h4 className="text-lg font-bold text-white mb-4">📝 Templates disponibles</h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            'Note de calcul structure',
            'Rapport géotechnique',
            'Étude hydraulique',
            'Devis quantitatif estimatif',
            'Planning d\'exécution',
            'Rapport de conformité'
          ].map((template, idx) => (
            <button
              key={idx}
              className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-left text-sm text-gray-300 border border-gray-600/50 hover:border-indigo-500/50 transition"
            >
              {template}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// components/PlanAnalyzer.jsx
// ============================================
export function PlanAnalyzer({ file, onAnalysisComplete }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (file) {
      performAnalysis();
    }
  }, [file]);

  const performAnalysis = async () => {
    setAnalyzing(true);
    
    const steps = [
      { label: 'Extraction OCR', duration: 2000 },
      { label: 'Détection objets', duration: 1500 },
      { label: 'Analyse IA', duration: 3000 },
      { label: 'Calculs préliminaires', duration: 2000 }
    ];

    for (let i = 0; i < steps.length; i++) {
      setProgress((i + 1) / steps.length * 100);
      await new Promise(resolve => setTimeout(resolve, steps[i].duration));
    }

    setAnalyzing(false);
    onAnalysisComplete?.();
  };

  if (!analyzing) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl p-8 max-w-md w-full border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4">🔍 Analyse en cours...</h3>
        
        <div className="space-y-4">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <p className="text-sm text-gray-400 text-center">
            {progress < 25 && '📄 Extraction du texte...'}
            {progress >= 25 && progress < 50 && '🔍 Détection des éléments...'}
            {progress >= 50 && progress < 75 && '🤖 Analyse par IA...'}
            {progress >= 75 && '🔧 Calculs préliminaires...'}
          </p>
        </div>
      </div>
    </div>
  );
}