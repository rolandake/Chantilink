import React from 'react';
import { useState, useEffect } from 'react';

const STORAGE_KEY = "construction-infrastructure-history";

export default function ConstructionInfrastructure({ onCostChange = () => {} }) {
  const [heuresTravail, setHeuresTravail] = useState("");
  const [coutHoraireMainOeuvre, setCoutHoraireMainOeuvre] = useState("");
  const [joursLocationEngins, setJoursLocationEngins] = useState("");
  const [coutJournalierLocation, setCoutJournalierLocation] = useState("");
  const [tonnesTransportees, setTonnesTransportees] = useState("");
  const [coutTransportParTonne, setCoutTransportParTonne] = useState("");
  const [coutImprevus, setCoutImprevus] = useState("");
  const [historique, setHistorique] = useState([]);

  // Calcul des sous-totaux
  const coutMainOeuvre = (parseFloat(heuresTravail) || 0) * (parseFloat(coutHoraireMainOeuvre) || 0);
  const coutLocation = (parseFloat(joursLocationEngins) || 0) * (parseFloat(coutJournalierLocation) || 0);
  const coutTransport = (parseFloat(tonnesTransportees) || 0) * (parseFloat(coutTransportParTonne) || 0);
  const total =
    coutMainOeuvre +
    coutLocation +
    coutTransport +
    (parseFloat(coutImprevus) || 0);

  // Transmission du total au parent
  useEffect(() => {
    onCostChange(total);
  }, [total]);

  // Chargement historique au montage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistorique(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Sauvegarde historique à chaque changement
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historique));
  }, [historique]);

  const handleSave = () => {
    if (total === 0) {
      alert("⚠️ Veuillez saisir au moins une valeur non nulle");
      return;
    }
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      heuresTravail,
      coutHoraireMainOeuvre,
      coutMainOeuvre: coutMainOeuvre.toFixed(2),
      joursLocationEngins,
      coutJournalierLocation,
      coutLocation: coutLocation.toFixed(2),
      tonnesTransportees,
      coutTransportParTonne,
      coutTransport: coutTransport.toFixed(2),
      coutImprevus,
      total: total.toFixed(2),
    };
    setHistorique([entry, ...historique]);
    alert("✅ Coûts construction infrastructure enregistrés !");
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

  // JSX formulaire + historique
  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h3 className="text-xl font-bold text-orange-400 mb-4">Construction Infrastructure</h3>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          {
            label: "Heures de travail",
            value: heuresTravail,
            setter: setHeuresTravail,
          },
          {
            label: "Coût horaire main d'œuvre (XOF)",
            value: coutHoraireMainOeuvre,
            setter: setCoutHoraireMainOeuvre,
          },
          {
            label: "Jours de location engins",
            value: joursLocationEngins,
            setter: setJoursLocationEngins,
          },
          {
            label: "Coût journalier location (XOF)",
            value: coutJournalierLocation,
            setter: setCoutJournalierLocation,
          },
          {
            label: "Tonnes transportées",
            value: tonnesTransportees,
            setter: setTonnesTransportees,
          },
          {
            label: "Coût transport par tonne (XOF)",
            value: coutTransportParTonne,
            setter: setCoutTransportParTonne,
          },
          {
            label: "Coût imprévus (XOF)",
            value: coutImprevus,
            setter: setCoutImprevus,
            full: true,
          },
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
                <p>Main d'œuvre: {item.coutMainOeuvre} XOF</p>
                <p>Location: {item.coutLocation} XOF</p>
                <p>Transport: {item.coutTransport} XOF</p>
                <p>Imprévus: {item.coutImprevus} XOF</p>
                <p className="font-bold">Total: {item.total} XOF</p>
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


