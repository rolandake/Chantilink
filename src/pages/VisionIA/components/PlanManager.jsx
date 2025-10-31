// src/pages/VisionIA/components/PlanManager.jsx
import React, { useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000";

export default function PlanManager({ projectType, setCurrentPlanSummary, plansQueue, socketRef, handleAddMessage }) {
  const [plans, setPlans] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [previewPlan, setPreviewPlan] = useState(null);

  // --- Gestion des fichiers déposés ou importés ---
  const handleFiles = (files) => {
    if (!files || files.length === 0) return;
    const MAX_SIZE = 50 * 1024 * 1024; // 50 Mo max

    const newPlans = Array.from(files)
      .filter(f => f.size <= MAX_SIZE)
      .map(f => ({
        id: Date.now() + Math.random(),
        name: f.name,
        url: URL.createObjectURL(f),
        type: f.type,
        file: f
      }));

    if (!newPlans.length) return;

    const updatedPlans = [...plans, ...newPlans];
    setPlans(updatedPlans);
    setCurrentPlanSummary(updatedPlans.map(p => p.name).join(", "));

    const plansWithProject = newPlans.map(p => ({ ...p, project: projectType }));
    plansQueue.current.push(...plansWithProject);

    plansWithProject.forEach(p => {
      // Mise à jour de l'historique via socket
      socketRef.current?.emit("updateHistory", { type: "newPlan", data: p });

      // Message IA seulement pour upload
      handleAddMessage({
        id: Date.now() + Math.random(),
        role: "ai",
        content: `✅ Nouveau plan "${p.name}" ajouté au projet "${projectType}".`
      });

      // ❌ Suppression de l’analyse automatique à l’upload
      // analyzePlan(p);
    });
  };

  // --- Analyse plan déclenchée par l'utilisateur ---
  const analyzePlan = async (plan) => {
    try {
      setUploading(true);
      handleAddMessage({
        id: Date.now() + Math.random(),
        role: "ai",
        content: `🔍 Analyse en cours pour le plan "${plan.name}"...`
      });

      const formData = new FormData();
      formData.append("plan", plan.file || plan);
      formData.append("projectType", projectType);

      const res = await axios.post(`${API_URL}/api/vision/analyze`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data?.analysis) {
        handleAddMessage({
          id: Date.now() + Math.random(),
          role: "ai",
          content: `📊 Analyse terminée pour "${plan.name}":\n${res.data.analysis}`
        });
      }
    } catch (err) {
      console.error("Erreur analyse plan :", err);
      handleAddMessage({
        id: Date.now() + Math.random(),
        role: "ai",
        content: `❌ Erreur lors de l'analyse du plan "${plan.name}".`
      });
    } finally {
      setUploading(false);
    }
  };

  // --- Suppression d'un plan ---
  const removePlan = (id) => {
    const removed = plans.find(p => p.id === id);
    setPlans(plans.filter(p => p.id !== id));
    handleAddMessage({
      id: Date.now() + Math.random(),
      role: "ai",
      content: `🗑️ Le plan "${removed?.name}" a été supprimé.`
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-2xl shadow-lg p-2">
      {/* Zone d'import */}
      <div
        className={`flex flex-col items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-600 rounded-xl bg-gray-800 cursor-pointer hover:border-indigo-500 transition-all duration-300 ${uploading ? "opacity-70" : ""}`}
        onClick={() => document.getElementById("planInput")?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { 
          e.preventDefault(); 
          if (e.currentTarget.contains(e.target)) handleFiles(e.dataTransfer.files); 
        }}
      >
        {plans.length === 0 ? (
          <p className="text-center text-gray-300 text-sm">
            {uploading ? "⏳ Upload en cours..." : "📂 Glissez vos plans ici ou cliquez pour importer"}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 justify-center max-h-28 overflow-auto">
            {plans.map(plan => (
              <div key={plan.id} className="relative flex flex-col items-center p-1 bg-gray-700 rounded-md shadow-md hover:shadow-lg transition">
                {plan.type.startsWith("image/") ? (
                  <img
                    src={plan.url}
                    alt={plan.name}
                    className="w-20 h-20 object-cover rounded-md cursor-pointer"
                    onClick={() => setPreviewPlan(plan)}
                  />
                ) : (
                  <div
                    className="w-20 h-20 flex items-center justify-center bg-gray-600 rounded-md text-xs text-gray-300 font-semibold cursor-pointer"
                    onClick={() => setPreviewPlan(plan)}
                  >
                    PDF
                  </div>
                )}
                <span className="mt-1 text-xs text-gray-200 truncate w-20 text-center">{plan.name}</span>

                {/* Supprimer */}
                <button
                  onClick={() => removePlan(plan.id)}
                  className="absolute top-1 right-1 bg-red-600 text-white text-xs rounded-full px-1 hover:bg-red-500"
                  title="Supprimer le plan"
                >
                  ✖
                </button>

                {/* Analyser */}
                <button
                  onClick={() => analyzePlan(plan)}
                  className="absolute bottom-1 right-1 bg-indigo-600 text-white text-xs rounded-full px-2 hover:bg-indigo-500"
                  title="Analyser le plan"
                >
                  ➤
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          id="planInput"
          type="file"
          accept=".pdf,image/*"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {/* Modal Preview */}
      {previewPlan && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setPreviewPlan(null)}
        >
          {previewPlan.type.startsWith("image/") ? (
            <img
              src={previewPlan.url}
              alt={previewPlan.name}
              className="max-h-[90%] max-w-[90%] rounded-md shadow-lg"
            />
          ) : (
            <div className="bg-white p-4 rounded-md max-h-[90%] max-w-[90%] overflow-auto shadow-lg">
              <p className="font-bold mb-2">{previewPlan.name}</p>
              <iframe src={previewPlan.url} className="w-[80vw] h-[80vh]" title={previewPlan.name} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
