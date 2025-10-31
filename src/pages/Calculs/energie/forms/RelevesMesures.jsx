import React from 'react';
import { useEffect, useState } from 'react';

const STORAGE_KEY = "audit-releves-history";

export default function RelevesMesures({ currency = "XOF", onTotalChange = () => {}, onDataChange = () => {} }) {
  // Exemple données : température moyenne, humidité, consommation relevée, coût énergie
  const [temperature, setTemperature] = useState("");
  const [humidite, setHumidite] = useState("");
  const [consoRelevee, setConsoRelevee] = useState(""); // kWh
  const [prixEnergie, setPrixEnergie] = useState("");
  const [coutFixe, setCoutFixe] = useState("");
  const [historique, setHistorique] = useState([]);

  // Calcul coût relevé
  const total = (parseFloat(consoRelevee) || 0) * (parseFloat(prixEnergie) || 0) + (parseFloat(coutFixe) || 0);

  // Envoi au parent
  useEffect(() => {
    onTotalChange(total);
    onDataChange({ temperature, humidite, consoRelevee, prixEnergie, coutFixe, total });
  }, [total, temperature, humidite, consoRelevee, prixEnergie, coutFixe]);

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

  // Sauvegarde entrée
  const handleSave = () => {
    if (!consoRelevee || total === 0) {
      alert("⚠️ Veuillez saisir une consommation relevée valide.");
      return;
    }
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      temperature,
      humidite,
      consoRelevee,
      prixEnergie,
      coutFixe,
      total: total.toFixed(2),
    };
    setHistorique([entry, ...historique]);
    alert("✅ Relevé enregistré !");
  };

  // Suppression entrée
  const handleDelete = (id) => {
    if (confirm("🗑️ Supprimer ce relevé ?")) {
      setHistorique(historique.filter((item) => item.id !== id));
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
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">📊 Relevés et mesures</h2>

      <div className="grid grid-cols-2 gap-5 mb-6">
        {[
          { label: "Température moyenne (°C)", value: temperature, setter: setTemperature },
          { label: "Humidité moyenne (%)", value: humidite, setter: setHumidite },
          { label: "Consommation relevée (kWh)", value: consoRelevee, setter: setConsoRelevee },
          { label: `Prix énergie (${currency}/kWh)`, value: prixEnergie, setter: setPrixEnergie },
          { label: `Coût fixe annuel (${currency})`, value: coutFixe, setter: setCoutFixe, full: true },
        ].map(({ label, value, setter, full }, idx) => (
          <div className={full ? "col-span-2" : ""} key={idx}>
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

      <div className="grid grid-cols-2 gap-4 bg-gray-800 rounded-md p-4 mb-6 shadow-inner">
        <div>
          <p>🌡️ Température moyenne : <span className="text-orange-400 font-semibold">{temperature || 0} °C</span></p>
          <p>💧 Humidité moyenne : <span className="text-orange-400 font-semibold">{humidite || 0} %</span></p>
          <p>⚡ Consommation relevée : <span className="text-orange-400 font-semibold">{consoRelevee || 0} kWh</span></p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-orange-400">💰 Coût total relevé : {total.toLocaleString()} {currency}</p>
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
                <p>Température : {item.temperature} °C</p>
                <p>Humidité : {item.humidite} %</p>
                <p>Consommation relevée : {item.consoRelevee} kWh</p>
                <p>Prix énergie : {item.prixEnergie} {currency}/kWh</p>
                <p>Coût fixe annuel : {item.coutFixe} {currency}</p>
                <p className="font-bold text-orange-300">Coût total : {item.total} {currency}</p>
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


