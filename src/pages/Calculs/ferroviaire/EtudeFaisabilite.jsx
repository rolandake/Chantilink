import React from 'react';
// src/pages/Calculs/ferroviaire/forms/EtudeFaisabilite.jsx
import { useState, useEffect } from 'react';

const STORAGE_KEY = "etude-faisabilite-history";

export default function EtudeFaisabilite({ onStatusChange = () => {} }) {
  const [description, setDescription] = useState("");
  const [budgetEstime, setBudgetEstime] = useState("");
  const [dureeEstimee, setDureeEstimee] = useState("");
  const [etat, setEtat] = useState("Non commencé"); // Exemple d'état simple
  const [historique, setHistorique] = useState([]);

  // Notifie le parent du changement d'état
  useEffect(() => {
    onStatusChange(etat);
  }, [etat]);

  // Chargement historique
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistorique(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Sauvegarde historique
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historique));
  }, [historique]);

  const handleSave = () => {
    if (!description.trim() || !budgetEstime || !dureeEstimee) {
      alert("⚠️ Veuillez remplir tous les champs avant de sauvegarder.");
      return;
    }

    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      description,
      budgetEstime: parseFloat(budgetEstime),
      dureeEstimee,
      etat,
    };

    setHistorique([entry, ...historique]);
    alert("✅ Étude de faisabilité sauvegardée !");
  };

  const handleDelete = (id) => {
    if (confirm("🗑️ Supprimer cette entrée ?")) {
      setHistorique(historique.filter((item) => item.id !== id));
    }
  };

  const clearHistorique = () => {
    if (confirm("🧹 Vider tout l'historique ?")) {
      setHistorique([]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">🔍 Étude de faisabilité</h2>

      <div className="grid grid-cols-1 gap-5 mb-6">
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Description</label>
          <textarea
            rows="4"
            value={description}
            onInput={(e) => setDescription(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            placeholder="Décrivez brièvement l'étude de faisabilité"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-400">Budget estimé (XOF)</label>
          <input
            type="number"
            min="0"
            step="any"
            value={budgetEstime}
            onInput={(e) => setBudgetEstime(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            placeholder="0"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-400">Durée estimée</label>
          <input
            type="text"
            value={dureeEstimee}
            onInput={(e) => setDureeEstimee(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            placeholder="Ex : 6 mois"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-400">État</label>
          <select
            value={etat}
            onInput={(e) => setEtat(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
          >
            <option>Non commencé</option>
            <option>En cours</option>
            <option>Terminé</option>
            <option>En pause</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 justify-center mb-6 flex-wrap">
        <button
          onClick={handleSave}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold shadow"
        >
          💾 Enregistrer
        </button>
        <button
          onClick={clearHistorique}
          className="px-5 py-2 bg-red-600 hover:bg-red-700 rounded-md font-semibold shadow"
        >
          🧹 Effacer l'historique
        </button>
      </div>

      {historique.length > 0 && (
        <section
          className="max-h-80 overflow-y-auto bg-gray-800 rounded-md p-4 shadow-inner scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-700"
        >
          <h3 className="text-lg font-bold text-orange-400 mb-3 text-center">🕓 Historique</h3>
          {historique.map((item) => (
            <div
              key={item.id}
              className="bg-gray-700 rounded-md p-3 mb-3 flex justify-between items-center text-sm"
            >
              <div className="space-y-1">
                <time className="block text-xs text-gray-400">{item.date}</time>
                <p><strong>Description:</strong> {item.description}</p>
                <p><strong>Budget estimé:</strong> {item.budgetEstime.toLocaleString()} XOF</p>
                <p><strong>Durée estimée:</strong> {item.dureeEstimee}</p>
                <p><strong>État:</strong> {item.etat}</p>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="ml-4 px-2 py-1 bg-red-600 hover:bg-red-700 rounded-md text-white font-semibold"
              >
                ✖
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}


