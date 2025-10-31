import React from 'react';
import { useEffect, useState } from 'react';

const STORAGE_KEY = "miniHydro-test-service-history";

export default function TestMiseEnService({ onTotalChange = () => {}, onNext = () => {} }) {
  const [tempsTest, setTempsTest] = useState(""); // en heures
  const [puissanceMesuree, setPuissanceMesuree] = useState(""); // kW
  const [energieProduite, setEnergieProduite] = useState(0); // kWh

  const [historique, setHistorique] = useState([]);

  // Calcul énergie produite = puissanceMesuree * tempsTest
  useEffect(() => {
    const t = parseFloat(tempsTest.replace(",", "."));
    const p = parseFloat(puissanceMesuree.replace(",", "."));
    if (t > 0 && p > 0) {
      setEnergieProduite((t * p).toFixed(2));
      onTotalChange(t * p);
    } else {
      setEnergieProduite(0);
      onTotalChange(0);
    }
  }, [tempsTest, puissanceMesuree]);

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
    if (energieProduite <= 0) {
      alert("⚠️ Veuillez saisir des valeurs valides.");
      return;
    }
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      tempsTest,
      puissanceMesuree,
      energieProduite,
    };
    setHistorique([entry, ...historique]);
    alert("✅ Test sauvegardé !");
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
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">⚙️ Test & Mise en Service</h2>

      <div className="grid grid-cols-2 gap-5 mb-6">
        {[
          { label: "Temps de test (heures)", value: tempsTest, setter: setTempsTest },
          { label: "Puissance mesurée (kW)", value: puissanceMesuree, setter: setPuissanceMesuree },
        ].map(({ label, value, setter }, idx) => (
          <div key={idx}>
            <label className="block mb-1 font-semibold text-orange-400">{label}</label>
            <input
              type="text"
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
          Énergie produite pendant le test :{" "}
          <span className="font-bold text-orange-400">{energieProduite} kWh</span>
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
          {historique.map(({ id, date, tempsTest, puissanceMesuree, energieProduite }) => (
            <div key={id} className="bg-gray-700 rounded-md p-3 mb-3 flex flex-col gap-1 text-sm">
              <time className="text-xs text-gray-400">{date}</time>
              <p>Temps de test : {tempsTest} h</p>
              <p>Puissance mesurée : {puissanceMesuree} kW</p>
              <p>Énergie produite : <span className="font-semibold text-orange-400">{energieProduite} kWh</span></p>
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
          disabled={energieProduite <= 0}
          onClick={onNext}
          className="px-6 py-2 bg-orange-500 rounded font-semibold hover:bg-orange-600 disabled:opacity-50"
        >
          Suivant →
        </button>
      </div>
    </div>
  );
}


