import React from 'react';
import { useState, useEffect } from 'react';

const STORAGE_KEY = "audit-recommandations-history";

export default function Recommandations() {
  const [texte, setTexte] = useState("");
  const [historique, setHistorique] = useState([]);

  // Charger historique au montage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistorique(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Sauvegarder historique à chaque modification
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historique));
  }, [historique]);

  const handleAdd = () => {
    if (!texte.trim()) {
      alert("Veuillez saisir une recommandation.");
      return;
    }

    const newEntry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      contenu: texte.trim(),
    };

    setHistorique([newEntry, ...historique]);
    setTexte("");
  };

  const handleDelete = (id) => {
    if (confirm("Supprimer cette recommandation ?")) {
      setHistorique(historique.filter((item) => item.id !== id));
    }
  };

  const clearHistorique = () => {
    if (confirm("Vider toutes les recommandations ?")) {
      setHistorique([]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">💡 Recommandations</h2>

      <textarea
        rows="4"
        value={texte}
        onInput={(e) => setTexte(e.target.value)}
        placeholder="Saisissez votre recommandation ici..."
        className="w-full rounded-md px-3 py-2 mb-4 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400 resize-none"
      />

      <div className="flex justify-center gap-4 mb-6 flex-wrap">
        <button
          onClick={handleAdd}
          className="px-5 py-2 bg-orange-500 hover:bg-orange-600 rounded-md font-semibold shadow text-white"
        >
          ➕ Ajouter
        </button>
        <button
          onClick={clearHistorique}
          className="px-5 py-2 bg-red-600 hover:bg-red-700 rounded-md font-semibold shadow text-white"
          disabled={historique.length === 0}
        >
          🧹 Vider tout
        </button>
      </div>

      {historique.length === 0 ? (
        <p className="text-gray-400 italic text-center">Aucune recommandation enregistrée.</p>
      ) : (
        <ul className="space-y-4 max-h-80 overflow-y-auto bg-gray-800 rounded-md p-4 shadow-inner scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-700">
          {historique.map(({ id, date, contenu }) => (
            <li
              key={id}
              className="bg-gray-700 p-3 rounded-md flex justify-between items-start gap-4"
            >
              <div className="flex-1">
                <time className="block text-xs text-gray-400 mb-1">{date}</time>
                <p>{contenu}</p>
              </div>
              <button
                onClick={() => handleDelete(id)}
                className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md text-white font-semibold self-start"
                title="Supprimer"
              >
                ✖
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


