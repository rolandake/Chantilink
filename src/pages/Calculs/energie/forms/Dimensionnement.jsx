import React from 'react';
import { useEffect, useState } from 'react';

const STORAGE_KEY = "miniHydro-dimensionnement-history";

export default function Dimensionnement({ onTotalChange = () => {}, onNext = () => {} }) {
  // Inputs
  const [puissance, setPuissance] = useState(""); // kW
  const [efficiency, setEfficiency] = useState("0.9"); // rendement générateur
  const [voltage, setVoltage] = useState("400"); // volts
  const [courant, setCourant] = useState(0); // ampères calculé
  const [frequence, setFrequence] = useState("50"); // Hz

  const [historique, setHistorique] = useState([]);

  // Calculs : I = P / (√3 * U * cosφ), ici on simplifie cosφ = efficiency
  useEffect(() => {
    const P = parseFloat(puissance.replace(",", "."));
    const U = parseFloat(voltage.replace(",", "."));
    const eff = parseFloat(efficiency.replace(",", "."));
    if (P > 0 && U > 0 && eff > 0 && eff <= 1) {
      // Courant triphasé approximé
      const I = P / (Math.sqrt(3) * U * eff);
      setCourant(I.toFixed(2));
      onTotalChange(I);
    } else {
      setCourant(0);
      onTotalChange(0);
    }
  }, [puissance, voltage, efficiency]);

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

  // Sauvegarder entrée
  const handleSave = () => {
    if (courant <= 0) {
      alert("⚠️ Veuillez saisir des valeurs valides.");
      return;
    }
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      puissance,
      efficiency,
      voltage,
      frequence,
      courant,
    };
    setHistorique([entry, ...historique]);
    alert("✅ Dimensionnement sauvegardé !");
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
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">⚙️ Dimensionnement technique</h2>

      <div className="grid grid-cols-2 gap-5 mb-6">
        {[
          { label: "Puissance estimée (kW)", value: puissance, setter: setPuissance },
          { label: "Rendement générateur (0-1)", value: efficiency, setter: setEfficiency },
          { label: "Tension (Volts)", value: voltage, setter: setVoltage },
          { label: "Fréquence (Hz)", value: frequence, setter: setFrequence },
        ].map(({ label, value, setter }, idx) => (
          <div key={idx}>
            <label className="block mb-1 font-semibold text-orange-400">{label}</label>
            <input
              type="number"
              min="0"
              step="any"
              value={value}
              onInput={(e) => setter(e.currentTarget.value)}
              className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
              placeholder="0"
            />
          </div>
        ))}
      </div>

      <div className="mb-6 text-center text-lg">
        <p>
          Courant estimé : <span className="font-bold text-orange-400">{courant} A</span>
        </p>
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
          {historique.map(({ id, date, puissance, efficiency, voltage, frequence, courant }) => (
            <div key={id} className="bg-gray-700 rounded-md p-3 mb-3 flex flex-col gap-1 text-sm">
              <time className="text-xs text-gray-400">{date}</time>
              <p>Puissance : {puissance} kW</p>
              <p>Rendement : {efficiency}</p>
              <p>Tension : {voltage} V</p>
              <p>Fréquence : {frequence} Hz</p>
              <p>Courant estimé : <span className="font-semibold text-orange-400">{courant} A</span></p>
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
          disabled={courant <= 0}
          onClick={onNext}
          className="px-6 py-2 bg-orange-500 rounded font-semibold hover:bg-orange-600 disabled:opacity-50"
        >
          Suivant →
        </button>
      </div>
    </div>
  );
}


