import React from 'react';
import { useState, useEffect } from 'react';

const STORAGE_KEY = "suivi-maintenance-history";

export default function SuiviMaintenance({ onCostChange = () => {} }) {
  const [frequenceMensuelle, setFrequenceMensuelle] = useState("");
  const [coutParIntervention, setCoutParIntervention] = useState("");
  const [dureeMois, setDureeMois] = useState("");
  const [coutPersonnel, setCoutPersonnel] = useState("");
  const [autresCouts, setAutresCouts] = useState("");
  const [historique, setHistorique] = useState([]);

  // Calcul total = fréquence x durée x coût par intervention + coûts personnels + autres coûts
  const totalInterventions =
    (parseFloat(frequenceMensuelle) || 0) * (parseFloat(dureeMois) || 0) * (parseFloat(coutParIntervention) || 0);
  const total =
    totalInterventions +
    (parseFloat(coutPersonnel) || 0) +
    (parseFloat(autresCouts) || 0);

  useEffect(() => {
    onCostChange(total);
  }, [total]);

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

  const handleSave = () => {
    if (total === 0) {
      alert("⚠️ Veuillez entrer des valeurs valides");
      return;
    }
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      frequenceMensuelle,
      dureeMois,
      coutParIntervention,
      coutPersonnel,
      autresCouts,
      totalInterventions: totalInterventions.toFixed(2),
      total: total.toFixed(2),
    };
    setHistorique([entry, ...historique]);
    alert("✅ Coûts suivi & maintenance enregistrés !");
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
      <h3 className="text-xl font-bold text-orange-400 mb-4">Suivi & Maintenance</h3>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: "Fréquence mensuelle d'intervention", value: frequenceMensuelle, setter: setFrequenceMensuelle },
          { label: "Durée (mois)", value: dureeMois, setter: setDureeMois },
          { label: "Coût par intervention (XOF)", value: coutParIntervention, setter: setCoutParIntervention },
          { label: "Coût personnel (XOF)", value: coutPersonnel, setter: setCoutPersonnel },
          { label: "Autres coûts (XOF)", value: autresCouts, setter: setAutresCouts, full: true },
        ].map(({ label, value, setter, full }, idx) => (
          <div className={full ? "col-span-3" : "col-span-1"} key={idx}>
            <label className="block mb-1 font-semibold text-orange-400">{label}</label>
            <input
              type="number"
              min="0"
              step="any"
              value={value}
              onInput={(e) => setter(e.target.value)}
              className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
              placeholder="0"
            />
          </div>
        ))}
      </div>

      <p className="text-lg font-bold text-orange-400 mt-2">
        💰 Total estimé : {total.toFixed(2)} XOF
      </p>

      <div className="flex gap-3 justify-center my-4 flex-wrap">
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
        <section className="max-h-48 overflow-y-auto bg-gray-800 rounded-md p-3 shadow-inner scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-700">
          <h4 className="text-lg font-bold text-orange-400 mb-2 text-center">Historique</h4>
          {historique.map((item) => (
            <div
              key={item.id}
              className="bg-gray-700 rounded-md p-2 mb-2 flex justify-between items-center text-sm"
            >
              <div>
                <time className="block text-xs text-gray-400">{item.date}</time>
                <p>Fréquence mensuelle : {item.frequenceMensuelle}</p>
                <p>Durée (mois) : {item.dureeMois}</p>
                <p>Coût par intervention : {item.coutParIntervention} XOF</p>
                <p>Coût personnel : {item.coutPersonnel} XOF</p>
                <p>Autres coûts : {item.autresCouts} XOF</p>
                <p className="font-bold">Total : {item.total} XOF</p>
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


