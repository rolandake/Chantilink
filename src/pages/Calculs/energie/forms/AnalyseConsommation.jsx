import React from 'react';
import { useState, useEffect } from 'react';

const STORAGE_KEY = "analyse-consommation-history";

export default function AnalyseConsommation({ currency = "kWh" }) {
  const [mois, setMois] = useState("");
  const [consommation, setConsommation] = useState("");
  const [historique, setHistorique] = useState([]);

  // Charge historique au montage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistorique(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Sauvegarde historique à chaque modification
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historique));
  }, [historique]);

  const handleAdd = () => {
    if (!mois.trim() || !consommation || isNaN(consommation) || consommation <= 0) {
      alert("Merci de saisir un mois valide et une consommation positive.");
      return;
    }
    if (historique.find((h) => h.mois === mois.trim())) {
      alert("Ce mois est déjà enregistré.");
      return;
    }

    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      mois: mois.trim(),
      consommation: parseFloat(consommation),
    };

    setHistorique([entry, ...historique]);
    setMois("");
    setConsommation("");
  };

  const handleDelete = (id) => {
    if (confirm("Supprimer cette entrée ?")) {
      setHistorique(historique.filter((e) => e.id !== id));
    }
  };

  const totalConsommation = historique.reduce((sum, e) => sum + e.consommation, 0);

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">📊 Analyse Consommation</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder="Mois (ex: Janv 2025)"
          value={mois}
          onInput={(e) => setMois(e.target.value)}
          className="rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
        />
        <input
          type="number"
          placeholder={`Consommation (${currency})`}
          value={consommation}
          onInput={(e) => setConsommation(e.target.value)}
          min="0"
          step="0.1"
          className="rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
        />
        <button
          onClick={handleAdd}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded px-4 py-2"
        >
          Ajouter
        </button>
      </div>

      {historique.length === 0 ? (
        <p className="text-gray-400 italic text-center">Aucune donnée saisie.</p>
      ) : (
        <>
          <table className="w-full text-left mb-6 border border-gray-700 rounded">
            <thead>
              <tr className="bg-gray-800 text-orange-400">
                <th className="px-4 py-2 border border-gray-700">Date</th>
                <th className="px-4 py-2 border border-gray-700">Mois</th>
                <th className="px-4 py-2 border border-gray-700">Consommation ({currency})</th>
                <th className="px-4 py-2 border border-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {historique.map(({ id, date, mois, consommation }) => (
                <tr className="even:bg-gray-900 odd:bg-gray-800" key={id}>
                  <td className="px-4 py-2 border border-gray-700">{date}</td>
                  <td className="px-4 py-2 border border-gray-700">{mois}</td>
                  <td className="px-4 py-2 border border-gray-700">{consommation.toFixed(2)}</td>
                  <td className="px-4 py-2 border border-gray-700">
                    <button
                      onClick={() => handleDelete(id)}
                      className="bg-red-600 hover:bg-red-700 text-white rounded px-2 py-1"
                      title="Supprimer"
                    >
                      ✖
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-800 font-bold text-orange-400">
                <td colSpan="2" className="px-4 py-2 border border-gray-700 text-right">Total</td>
                <td className="px-4 py-2 border border-gray-700">{totalConsommation.toFixed(2)}</td>
                <td className="px-4 py-2 border border-gray-700"></td>
              </tr>
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}


