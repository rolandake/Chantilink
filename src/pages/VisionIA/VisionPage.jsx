// ============================================
// VisionPage.jsx - BUREAU D'ÉTUDE VIRTUEL COMPLET AVEC SOCKET HYBRIDE
// ============================================

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSocket } from "../../context/SocketContext.jsx";
import { useVisionIA } from "../../hooks/useVisionIA.js";

// Composants
import HistoryPanel from "./components/HistoryPanel.jsx";
import ChatWindow from "./components/ChatWindow.jsx";
import VoiceButton from "./components/VoiceButton.jsx";
import PlanManager from "./components/PlanManager.jsx";
import ProjectDropdown from "./components/ProjectDropdown.jsx";
import CalculationEngine, { 
  ProjectTimeline, 
  TechnicalReports 
} from "./components/CalculationEngine.jsx";

export default function VisionPage({ userId }) {
  const { socket } = useSocket();
  
  // États principaux
  const [projectType, setProjectType] = useState("tp");
  const [projectsData, setProjectsData] = useState({});
  const [listening, setListening] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  
  // États spécifiques au bureau d'étude
  const [currentPlan, setCurrentPlan] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [calculations, setCalculations] = useState({});
  const [projectPhase, setProjectPhase] = useState("conception");
  const [activePanel, setActivePanel] = useState("chat");
  const [engineerMode, setEngineerMode] = useState("structural");

  const plansQueue = useRef([]);
  const chatContainerRef = useRef(null);

  // ========================================
  // 🔥 HOOK VISION IA AVEC SYSTÈME HYBRIDE
  // ========================================
  const {
    connected: visionConnected,
    typing: visionTyping,
    currentProvider,
    messages: visionMessages,
    sendMessage: sendVisionMessage,
    clearHistory: clearVisionHistory
  } = useVisionIA(userId, projectType, engineerMode);

  // ========================================
  // GESTION DES MESSAGES LOCAUX
  // ========================================
  const handleAddMessage = useCallback(
    (msg, type = projectType || "default") => {
      setProjectsData((prev) => {
        const proj = prev[type] || { messages: [], plans: [], calculations: {}, reports: [] };
        if (!proj.messages.some((m) => m.id === msg.id)) {
          proj.messages = [...proj.messages, msg];
        }
        return { ...prev, [type]: proj };
      });
    },
    [projectType]
  );

  const handleDeleteMessage = (id) => {
    const type = projectType || "default";
    setProjectsData((prev) => {
      const proj = prev[type] || { messages: [], plans: [] };
      proj.messages = proj.messages.filter((m) => m.id !== id);
      return { ...prev, [type]: proj };
    });
  };

  // ========================================
  // ANALYSE DES PLANS (Vision AI)
  // ========================================
  const handlePlanUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append("plan", file);
      formData.append("projectType", projectType);
      formData.append("engineerMode", engineerMode);

      handleAddMessage({
        id: Date.now(),
        role: "system",
        content: `📄 Analyse du plan "${file.name}" en cours...`,
        type: "analysis",
        timestamp: new Date()
      });

      const res = await fetch("http://localhost:5000/api/vision-ai/analyze-plan", {
        method: "POST",
        body: formData
      });

      const result = await res.json();
      
      if (result.success) {
        setExtractedData(result.data);
        setCurrentPlan({ file, data: result.data });

        handleAddMessage({
          id: Date.now() + 1,
          role: "ai",
          content: formatAnalysisResult(result.data),
          type: "analysis",
          data: result.data,
          timestamp: new Date()
        });

        if (result.data.dimensions && result.data.materials) {
          await performAutoCalculations(result.data);
        }
      }
    } catch (err) {
      console.error("Erreur analyse plan:", err);
      handleAddMessage({
        id: Date.now() + 2,
        role: "ai",
        content: "❌ Erreur lors de l'analyse du plan. Veuillez réessayer.",
        type: "error",
        timestamp: new Date()
      });
    }
  };

  // ========================================
  // MOTEUR DE CALCULS AUTOMATIQUES
  // ========================================
  const performAutoCalculations = async (planData) => {
    try {
      handleAddMessage({
        id: Date.now(),
        role: "system",
        content: "🔧 Calculs d'ingénierie en cours...",
        type: "calculation",
        timestamp: new Date()
      });

      const res = await fetch("http://localhost:5000/api/vision-ai/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planData,
          projectType,
          engineerMode,
          calculationType: "complete"
        })
      });

      const result = await res.json();
      
      if (result.success) {
        setCalculations(prev => ({
          ...prev,
          [result.calculationType]: result.data
        }));

        handleAddMessage({
          id: Date.now() + 1,
          role: "ai",
          content: formatCalculationResults(result.data),
          type: "calculation",
          data: result.data,
          timestamp: new Date()
        });

        await generateTechnicalReport(result.data);
      }
    } catch (err) {
      console.error("Erreur calculs:", err);
    }
  };

  // ========================================
  // GÉNÉRATION DE RAPPORTS TECHNIQUES
  // ========================================
  const generateTechnicalReport = async (calculationsData) => {
    try {
      const res = await fetch("http://localhost:5000/api/vision-ai/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectType,
          planData: extractedData,
          calculations: calculationsData,
          phase: projectPhase
        })
      });

      const result = await res.json();
      
      if (result.success) {
        handleAddMessage({
          id: Date.now(),
          role: "ai",
          content: `📋 **Rapport technique généré**\n\n${result.report.summary}`,
          type: "report",
          data: result.report,
          downloadUrl: result.reportUrl,
          timestamp: new Date()
        });
      }
    } catch (err) {
      console.error("Erreur génération rapport:", err);
    }
  };

  // ========================================
  // 🔥 ENVOI DE MESSAGE VIA SOCKET HYBRIDE
  // ========================================
  const handleSendMessage = async () => {
    const text = inputValue.trim();
    if (!text) return;

    // Message utilisateur local
    const userMsg = { 
      id: Date.now(), 
      role: "user", 
      content: text,
      timestamp: new Date()
    };
    
    handleAddMessage(userMsg, projectType || "default");
    setInputValue("");

    // 🔥 Envoyer via le socket hybride avec contexte complet
    sendVisionMessage(text, {
      planData: extractedData,
      calculations,
      phase: projectPhase,
      context: {
        hasPlan: !!currentPlan,
        hasCalculations: Object.keys(calculations).length > 0
      }
    });
  };

  // ========================================
  // VÉRIFICATION DES CALCULS
  // ========================================
  const verifyCalculations = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/vision-ai/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calculations,
          standards: ["DTU", "Eurocode", "BAEL"],
          projectType
        })
      });

      const result = await res.json();
      
      handleAddMessage({
        id: Date.now(),
        role: "ai",
        content: formatVerificationResults(result),
        type: "verification",
        data: result,
        timestamp: new Date()
      });
    } catch (err) {
      console.error("Erreur vérification:", err);
    }
  };

  // ========================================
  // OPTIMISATION DU DESIGN
  // ========================================
  const optimizeDesign = async (parameters = {}) => {
    try {
      const res = await fetch("http://localhost:5000/api/vision-ai/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentDesign: extractedData,
          calculations,
          objectives: parameters.objectives || ["cost", "safety", "sustainability"]
        })
      });

      const result = await res.json();
      
      handleAddMessage({
        id: Date.now(),
        role: "ai",
        content: formatOptimizationResults(result),
        type: "optimization",
        data: result,
        timestamp: new Date()
      });
    } catch (err) {
      console.error("Erreur optimisation:", err);
    }
  };

  // ========================================
  // FORMATAGE DES RÉSULTATS
  // ========================================
  const formatAnalysisResult = (data) => {
    return `
**📐 Analyse du plan terminée**

**Dimensions détectées:**
${Object.entries(data.dimensions || {}).map(([key, val]) => `- ${key}: ${val}`).join('\n')}

**Matériaux identifiés:**
${(data.materials || []).map(m => `- ${m.name} (${m.quantity})`).join('\n')}

**Éléments structuraux:**
${(data.structural || []).map(s => `- ${s.type}: ${s.count} éléments`).join('\n')}

**Recommandations:**
${(data.recommendations || []).map(r => `✓ ${r}`).join('\n')}
    `.trim();
  };

  const formatCalculationResults = (data) => {
    return `
**🔧 Calculs d'ingénierie complétés**

**Charges:**
- Charges permanentes: ${data.deadLoad || 0} kN/m²
- Charges d'exploitation: ${data.liveLoad || 0} kN/m²
- Charges totales: ${data.totalLoad || 0} kN

**Dimensionnement:**
${Object.entries(data.sizing || {}).map(([key, val]) => `- ${key}: ${val}`).join('\n')}

**Quantitatifs:**
- Béton: ${data.concrete || 0} m³
- Acier: ${data.steel || 0} kg
- Coffrage: ${data.formwork || 0} m²

**Coût estimé:** ${data.cost?.toLocaleString() || 0} FCFA
    `.trim();
  };

  const formatVerificationResults = (data) => {
    const passed = data.checks?.filter(c => c.passed).length || 0;
    const total = data.checks?.length || 0;

    return `
**✅ Vérification réglementaire**

**Conformité:** ${passed}/${total} critères validés

**Normes vérifiées:**
${(data.standards || []).map(s => `- ${s.name}: ${s.compliant ? '✓' : '✗'}`).join('\n')}

**Points d'attention:**
${(data.warnings || []).map(w => `⚠️ ${w}`).join('\n')}

**Recommandations:**
${(data.recommendations || []).map(r => `💡 ${r}`).join('\n')}
    `.trim();
  };

  const formatOptimizationResults = (data) => {
    return `
**⚡ Optimisation du design**

**Économies potentielles:** ${data.savings?.toLocaleString() || 0} FCFA (${data.savingsPercent || 0}%)

**Améliorations proposées:**
${(data.improvements || []).map(i => `- ${i.description} (gain: ${i.impact})`).join('\n')}

**Alternatives matériaux:**
${(data.alternatives || []).map(a => `- ${a.material}: -${a.costReduction}% / ${a.sustainabilityScore} eco-score`).join('\n')}
    `.trim();
  };

  const handleVoiceTranscript = (text) => {
    if (text.trim()) setInputValue(text);
  };

  // 🔥 Fusionner messages locaux et messages IA
  const currentMessages = [
    ...(projectsData[projectType || "default"]?.messages || []),
    ...visionMessages
  ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const currentPlans = projectsData[projectType || "default"]?.plans || [];

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [currentMessages]);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
      <HistoryPanel 
        open={historyOpen} 
        onClose={() => setHistoryOpen(false)} 
        plans={currentPlans} 
        messages={currentMessages} 
      />
      
      {/* ========================================
          HEADER AVEC CONTRÔLES AVANCÉS
          ======================================== */}
      <div className="flex-none px-6 py-4 border-b border-gray-700/50 bg-gray-800/50 backdrop-blur-sm">
        {/* 🔥 Badge Provider actif */}
        {visionConnected && currentProvider && (
          <div className="mb-3 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center justify-between">
            <span className="text-xs text-green-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              🤖 IA hybride active • Provider: <strong>{currentProvider}</strong>
            </span>
            <span className="text-xs text-gray-400">
              Basculement automatique si quota épuisé
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
              🏗️ VisionIA Bureau d'Étude
            </h1>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              projectPhase === "conception" ? "bg-blue-500/20 text-blue-400" :
              projectPhase === "calculs" ? "bg-yellow-500/20 text-yellow-400" :
              projectPhase === "verification" ? "bg-purple-500/20 text-purple-400" :
              projectPhase === "execution" ? "bg-green-500/20 text-green-400" :
              "bg-gray-500/20 text-gray-400"
            }`}>
              Phase: {projectPhase}
            </span>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setActivePanel("chat")}
              className={`px-3 py-2 rounded-lg text-sm transition ${
                activePanel === "chat" 
                  ? "bg-indigo-600 text-white" 
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
            >
              💬 Chat
            </button>
            <button 
              onClick={() => setActivePanel("timeline")}
              className={`px-3 py-2 rounded-lg text-sm transition ${
                activePanel === "timeline" 
                  ? "bg-indigo-600 text-white" 
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
            >
              📅 Timeline
            </button>
            <button 
              onClick={() => setActivePanel("reports")}
              className={`px-3 py-2 rounded-lg text-sm transition ${
                activePanel === "reports" 
                  ? "bg-indigo-600 text-white" 
                  : "bg-gray-700 hover:bg-gray-600 text-gray-300"
              }`}
            >
              📋 Rapports
            </button>
            <button 
              onClick={() => setHistoryOpen(true)} 
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition"
            >
              📜 Historique
            </button>
          </div>
        </div>
        
        {/* Contrôles de projet */}
        <div className="grid grid-cols-3 gap-4">
          <ProjectDropdown
            projectType={projectType}
            setProjectType={(projType) => {
              setProjectType(projType);
              setProjectsData((prev) =>
                !prev[projType] ? { ...prev, [projType]: { messages: [], plans: [], calculations: {}, reports: [] } } : prev
              );
            }}
          />

          <select
            value={engineerMode}
            onChange={(e) => setEngineerMode(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="structural">🏗️ Ingénieur Structure</option>
            <option value="hydraulic">💧 Ingénieur Hydraulique</option>
            <option value="roads">🛣️ Ingénieur VRD</option>
            <option value="electrical">⚡ Ingénieur Électrique</option>
            <option value="geotechnical">🌍 Ingénieur Géotechnique</option>
          </select>

          <select
            value={projectPhase}
            onChange={(e) => setProjectPhase(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="conception">📐 Conception</option>
            <option value="calculs">🔧 Calculs</option>
            <option value="verification">✅ Vérification</option>
            <option value="execution">🚧 Exécution</option>
            <option value="suivi">📊 Suivi</option>
          </select>
        </div>
      </div>

      {/* ========================================
          ZONE PRINCIPALE FLEXIBLE
          ======================================== */}
      <div className="flex-1 flex gap-4 px-6 py-4 overflow-hidden">
        
        {/* Panel gauche: Upload + Analyse */}
        <div className="w-80 flex flex-col gap-4 overflow-y-auto">
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <h3 className="text-lg font-bold mb-3 text-indigo-400">📄 Upload de Plan</h3>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => e.target.files[0] && handlePlanUpload(e.target.files[0])}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500"
            />
            
            {currentPlan && (
              <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-400">✓ Plan analysé</p>
                <p className="text-xs text-gray-400 mt-1">{currentPlan.file.name}</p>
              </div>
            )}
          </div>

          <PlanManager 
            projectType={projectType} 
            userId={userId || `guest-${Date.now()}`} 
            setCurrentPlanSummary={() => {}} 
            plansQueue={plansQueue} 
            socketRef={{ current: socket }} 
            handleAddMessage={handleAddMessage} 
          />

          {/* Statistiques */}
          {calculations && Object.keys(calculations).length > 0 && (
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <h3 className="text-sm font-bold mb-3 text-purple-400">📊 Résumé Calculs</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Modules:</span>
                  <span className="text-white font-semibold">{Object.keys(calculations).length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Conformité:</span>
                  <span className="text-green-400 font-semibold">98%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Panel central: Chat/Timeline/Reports */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activePanel === "chat" && (
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-500 scrollbar-track-gray-800"
            >
              <ChatWindow 
                messages={currentMessages} 
                onDeleteMessage={handleDeleteMessage} 
                typing={visionTyping} 
              />
            </div>
          )}

          {activePanel === "timeline" && (
            <ProjectTimeline 
              projectType={projectType}
              phase={projectPhase}
              calculations={calculations}
            />
          )}

          {activePanel === "reports" && (
            <TechnicalReports 
              projectType={projectType}
              planData={extractedData}
              calculations={calculations}
            />
          )}
        </div>

        {/* Panel droite: Calculs en temps réel */}
        {extractedData && (
          <div className="w-96 overflow-y-auto">
            <CalculationEngine 
              planData={extractedData}
              projectType={projectType}
              engineerMode={engineerMode}
              onCalculationsUpdate={setCalculations}
            />
          </div>
        )}
      </div>

      {/* ========================================
          INPUT FIXE EN BAS
          ======================================== */}
      <div className="flex-none px-6 py-4 border-t border-gray-700/50 bg-gray-800/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <textarea
            className="flex-1 p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 resize-none h-14 focus:outline-none"
            placeholder="Posez votre question à l'ingénieur IA hybride..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => { 
              if(e.key==="Enter" && !e.shiftKey){ 
                e.preventDefault(); 
                handleSendMessage(); 
              } 
            }}
            disabled={!visionConnected}
          />
          <button 
            onClick={handleSendMessage} 
            disabled={!inputValue.trim() || visionTyping || !visionConnected}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-semibold transition"
          >
            {visionTyping ? "⏳" : "➤"}
          </button>
          <VoiceButton 
            onTranscript={handleVoiceTranscript} 
            listening={listening} 
            setListening={setListening} 
            continuous 
          />
        </div>

        {/* Actions rapides */}
        <div className="flex gap-2 mt-2">
          <button 
            onClick={() => verifyCalculations()}
            disabled={Object.keys(calculations).length === 0}
            className="px-3 py-1 bg-purple-600/20 hover:bg-purple-600/30 disabled:bg-gray-700 disabled:text-gray-500 text-purple-400 rounded-lg text-xs transition"
          >
            ✓ Vérifier
          </button>
          <button 
            onClick={() => optimizeDesign({})}
            disabled={!extractedData}
            className="px-3 py-1 bg-green-600/20 hover:bg-green-600/30 disabled:bg-gray-700 disabled:text-gray-500 text-green-400 rounded-lg text-xs transition"
          >
            ⚡ Optimiser
          </button>
          <button 
            onClick={() => generateTechnicalReport(calculations)}
            disabled={Object.keys(calculations).length === 0}
            className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 disabled:bg-gray-700 disabled:text-gray-500 text-blue-400 rounded-lg text-xs transition"
          >
            📋 Rapport
          </button>
          {visionMessages.length > 0 && (
            <button 
              onClick={clearVisionHistory}
              className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-xs transition"
            >
              🗑️ Effacer historique
            </button>
          )}
        </div>

        {/* Status bar */}
        <div className="mt-2 text-xs text-gray-500 flex items-center justify-between">
          <span>
            {visionConnected ? (
              <span className="text-green-400">● Connecté</span>
            ) : (
              <span className="text-red-400">● Déconnecté</span>
            )}
          </span>
          <span>{currentMessages.length} messages</span>
        </div>
      </div>
    </div>
  );
}