import React from 'react';
import { useState, useEffect } from 'react';

const STORAGE_KEY = "ferroviaire-projet-tracker";

const ETAPES_INIT = [
  "Étude de faisabilité",
  "Conception préliminaire",
  "Évaluation d’impact",
  "Études détaillées",
  "Acquisition du terrain",
  "Construction infrastructure",
  "Pose des rails",
  "Électrification",
  "Installation signalisation",
  "Essais et tests",
  "Mise en service",
  "Suivi maintenance"
];

export default function ProjetTracker() {
  const [taches, setTaches] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    // initialiser avec les étapes par défaut
    return ETAPES_INIT.map((nom) => ({ nom, statut: "À faire" }));
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(taches));
  }, [taches]);

  // Modifier le statut d’une tâche (cycle : À faire → En cours → Terminé → À faire)
  const toggleStatut = (index) => {
    setTaches((prev) => {
      const newTaches = [...prev];
      const etat = newTaches[index].statut;
      const suivant = etat === "À faire" ? "En cours" : etat === "En cours" ? "Terminé" : "À faire";
      newTaches[index] = { ...newTaches[index], statut: suivant };
      return newTaches;
    });
  };

  // Ajouter une nouvelle tâche
  const [nouvelleTache, setNouvelleTache] = useState("");
  const ajouterTache = () => {
    if (nouvelleTache.trim() === "") return;
    setTaches((prev) => [...prev, { nom: nouvelleTache.trim(), statut: "À faire" }]);
    setNouvelleTache("");
  };

  // Supprimer une tâche
  const supprimerTache = (index) => {
    if (confirm("🗑️ Supprimer cette tâche ?")) {
      setTaches((prev) => prev.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">📊 Suivi du projet ferroviaire</h2>

      <ul className="space-y-3 mb-6">
        {taches.map(({ nom, statut }, index) => (
          <li
            key={index}
            className="flex justify-between items-center bg-gray-800 rounded-md p-3 hover:bg-gray-700"
          >
            <span className={`cursor-pointer select-none ${statut === "Terminé" ? "line-through text-green-400" : statut === "En cours" ? "text-yellow-400" : "text-gray-300"}`} onClick={() => toggleStatut(index)}>
              {nom}
            </span>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statut === "À faire" ? "bg-gray-600" : statut === "En cours" ? "bg-yellow-500" : "bg-green-600"}`}>
                {statut}
              </span>
              <button
                onClick={() => supprimerTache(index)}
                className="text-red-600 hover:text-red-400 font-bold text-xl"
                title="Supprimer tâche"
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Nouvelle tâche..."
          value={nouvelleTache}
          onInput={(e) => setNouvelleTache(e.target.value)}
          className="flex-grow rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400 text-gray-100"
        />
        <button
          onClick={ajouterTache}
          className="px-5 py-2 bg-orange-600 hover:bg-orange-700 rounded-md font-semibold shadow"
        >
          ➕ Ajouter
        </button>
      </div>
    </div>
  );
}


