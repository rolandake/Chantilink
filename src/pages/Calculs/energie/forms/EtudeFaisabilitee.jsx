import React from 'react';
import { useEffect, useState } from 'react';

const STORAGE_KEY = "miniHydro-etudeFaisabilite-history";

export default function EtudeFaisabilite({ onTotalChange = () => {}, onNext = () => {} }) {
  const [debit, setDebit] = useState("");
  const [hauteurChute, setHauteurChute] = useState("");
  const [rendement, setRendement] = useState("0.7");
  const [puissanceEstimee, setPuissanceEstimee] = useState(0);
  const [commentaires, setCommentaires] = useState("");
  const [historique, setHistorique] = useState([]);

  // Calcul puissance hydraulique : P = 9.81 * Q * H * rendement
  useEffect(() => {
    const Q = parseFloat(debit.replace(",", "."));
    const H = parseFloat(hauteurChute.replace(",", "."));
    const r = parseFloat(rendement.replace(",", "."));
    if (Q > 0 && H > 0 && r > 0 && r <= 1) {
      const p = 9.81 * Q * H * r;
      setPuissanceEstimee(p.toFixed(2));
      onTotalChange(p);
    } else {
      setPuissanceEstimee(0);
      onTotalChange(0);
    }
  }, [debit, hauteurChute, rendement]);

  // Historique sauvegardé en localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistorique(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historique));
  }, [historique]);

  // Enregistrer l'entrée actuelle
  const handleSave = () => {
    if (puissanceEstimee <= 0) {
      alert("⚠️ Veuillez saisir des valeurs valides pour débit, hauteur et rendement.");
      return;
    }
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      debit,
      hauteurChute,
      rendement,
      puissanceEstimee,
      commentaires,
    };
    setHistorique([entry, ...historique]);
    alert("✅ Étude de faisabilité sauvegardée !");
  };

  // Supprimer entrée
  const handleDelete = (id) => {
    if (confirm("🗑️ Supprimer cette entrée ?")) {
      setHistorique(historique.filter((e) => e.id !== id));
    }
  };

  // Vider historique
  const clearHistorique = () => {
    if (confirm("🧹 Vider tout l'historique ?")) {
      setHistorique([]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">💧 Étude de faisabilité</h2>

      <div className="grid grid-cols-2 gap-5 mb-6">
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Débit disponible (m³/s)</label>
          <input
            type="number"
            min="0"
            step="any"
            value={debit}
            onInput={(e) => setDebit(e.currentTarget.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            placeholder="Ex : 2.5"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-400">Hauteur de chute (m)</label>
          <input
            type="number"
            min="0"
            step="any"
            value={hauteurChute}
            onInput={(e) => setHauteurChute(e.currentTarget.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            placeholder="Ex : 15"
          />
        </div>

        <div className="col-span-2">
          <label className="block mb-1 font-semibold text-orange-400">Rendement (0 - 1)</label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={rendement}
            onInput={(e) => setRendement(e.currentTarget.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            placeholder="Ex : 0.7"
          />
        </div>
      </div>

      <div className="mb-6 text-center text-lg">
        <p>
          Puissance hydraulique estimée :{" "}
          <span className="font-bold text-orange-400">{puissanceEstimee} kW</span>
        </p>
      </div>

      <div className="mb-6">
        <label className="block mb-1 font-semibold text-orange-400">Commentaires / Observations</label>
        <textarea
          rows="4"
          value={commentaires}
          onInput={(e) => setCommentaires(e.currentTarget.value)}
          className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400 text-gray-200"
          placeholder="Notes complémentaires sur le site, contraintes, etc."
        />
      </div>

      <div className="flex flex-wrap justify-center gap-3 mb-6">
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
        <section className="max-h-80 overflow-y-auto bg-gray-800 rounded-md p-4 shadow-inner scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-700">
          <h3 className="text-lg font-bold text-orange-400 mb-3 text-center">🕓 Historique</h3>
          {historique.map(({ id, date, debit, hauteurChute, rendement, puissanceEstimee, commentaires }) => (
            <div key={id} className="bg-gray-700 rounded-md p-3 mb-3 flex flex-col gap-1 text-sm">
              <time className="text-xs text-gray-400">{date}</time>
              <p>Débit : {debit} m³/s</p>
              <p>Hauteur de chute : {hauteurChute} m</p>
              <p>Rendement : {rendement}</p>
              <p>Puissance estimée : <span className="font-semibold text-orange-400">{puissanceEstimee} kW</span></p>
              {commentaires && <p>Commentaires : {commentaires}</p>}
              <button
                onClick={() => handleDelete(id)}
                className="self-end mt-2 px-2 py-1 bg-red-600 hover:bg-red-700 rounded-md text-white font-semibold"
              >
                ✖ Supprimer
              </button>
            </div>
          ))}
        </section>
      )}

      <div className="flex justify-end mt-6">
        <button
          disabled={puissanceEstimee <= 0}
          onClick={onNext}
          className="px-6 py-2 bg-orange-500 rounded font-semibold hover:bg-orange-600 disabled:opacity-50"
        >
          Suivant →
        </button>
      </div>
    </div>
  );
}


