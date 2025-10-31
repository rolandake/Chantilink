import React from 'react';
import { useState, useEffect } from 'react';

const STORAGE_KEY = "option-batteries-history";

const optionsBatteries = [
  { value: "aucune", label: "Aucune batterie", prixUnitaire: 0 },
  { value: "plomb_acide", label: "Batterie Plomb-acide", prixUnitaire: 120000 }, // prix par kWh en XOF
  { value: "lithium_ion", label: "Batterie Lithium-ion", prixUnitaire: 250000 },
  { value: "gel", label: "Batterie Gel", prixUnitaire: 180000 },
];

export default function OptionBatteries({ currency = "XOF", onTotalChange = () => {}, onMaterialsChange = () => {} }) {
  const [typeBatterie, setTypeBatterie] = useState("aucune");
  const [capacite, setCapacite] = useState(""); // capacité en kWh
  const [coutInstallation, setCoutInstallation] = useState("");
  const [historique, setHistorique] = useState([]);

  // Récupérer prix unitaire selon type
  const prixUnitaire = optionsBatteries.find(opt => opt.value === typeBatterie)?.prixUnitaire || 0;

  const total =
    (parseFloat(capacite) || 0) * prixUnitaire + (parseFloat(coutInstallation) || 0);

  // Envoi au parent
  useEffect(() => {
    onTotalChange(total);
    onMaterialsChange({ typeBatterie, capacite: parseFloat(capacite) || 0 });
  }, [total, typeBatterie, capacite]);

  // Historique
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
    if (typeBatterie !== "aucune" && (!capacite || capacite <= 0)) {
      alert("⚠️ Veuillez saisir une capacité valide.");
      return;
    }

    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      typeBatterie,
      capacite: (parseFloat(capacite) || 0).toFixed(2),
      prixUnitaire: prixUnitaire.toFixed(2),
      coutInstallation: (parseFloat(coutInstallation) || 0).toFixed(2),
      total: total.toFixed(2),
    };

    setHistorique([entry, ...historique]);
    alert("✅ Calcul sauvegardé !");
  };

  const handleDelete = (id) => {
    if (confirm("🗑️ Supprimer cette entrée ?")) {
      setHistorique(historique.filter(item => item.id !== id));
    }
  };

  const clearHistorique = () => {
    if (confirm("🧹 Vider tout l'historique ?")) {
      setHistorique([]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h3 className="text-2xl font-bold text-orange-400 mb-6 text-center">🔋 Option Batteries</h3>

      <div className="grid grid-cols-2 gap-5 mb-6">
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Type de batterie</label>
          <select
            value={typeBatterie}
            onChange={(e) => setTypeBatterie(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
          >
            {optionsBatteries.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {typeBatterie !== "aucune" && (
          <>
            <div>
              <label className="block mb-1 font-semibold text-orange-400">Capacité (kWh)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={capacite}
                onInput={(e) => setCapacite(e.target.value)}
                className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
                placeholder="Ex: 50"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold text-orange-400">Coût installation ({currency})</label>
              <input
                type="number"
                min="0"
                step="any"
                value={coutInstallation}
                onInput={(e) => setCoutInstallation(e.target.value)}
                className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
                placeholder="Ex: 300000"
              />
            </div>

            <div>
              <label className="block mb-1 font-semibold text-orange-400">Prix unitaire ({currency} / kWh)</label>
              <input
                type="number"
                value={prixUnitaire}
                disabled
                className="w-full rounded-md px-3 py-2 bg-gray-700 border border-gray-600 text-gray-400 cursor-not-allowed"
              />
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 bg-gray-800 rounded-md p-4 mb-6 shadow-inner">
        <div>
          <p>Type sélectionné : <span className="text-orange-400 font-semibold">{typeBatterie}</span></p>
          <p>Capacité : <span className="text-orange-400 font-semibold">{capacite || 0} kWh</span></p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-orange-400">
            💰 Total estimé : {total.toLocaleString()} {currency}
          </p>
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
          <h4 className="text-lg font-bold text-orange-400 mb-3 text-center">🕓 Historique</h4>
          {historique.map(item => (
            <div
              key={item.id}
              className="bg-gray-700 rounded-md p-3 mb-3 flex justify-between items-center text-sm"
            >
              <div className="space-y-1">
                <time className="block text-xs text-gray-400">{item.date}</time>
                <p>Type : {item.typeBatterie}</p>
                <p>Capacité : {item.capacite} kWh</p>
                <p>Prix unitaire : {item.prixUnitaire} {currency} / kWh</p>
                <p>Coût installation : {item.coutInstallation} {currency}</p>
                <p className="font-bold text-orange-300">Total : {item.total} {currency}</p>
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


