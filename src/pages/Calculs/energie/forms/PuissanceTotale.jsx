import React from 'react';
import { useState, useEffect } from 'react';

const STORAGE_KEY = "puissance-totale-history";

export default function PuissanceTotale({ onNext = () => {} }) {
  const [equipements, setEquipements] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { nom: "Éclairage", puissance: "" },
      { nom: "Chauffage", puissance: "" },
      { nom: "Appareils", puissance: "" },
    ];
  });

  const [coeffSimultaneite, setCoeffSimultaneite] = useState("0.8");
  const [coeffUtilisation, setCoeffUtilisation] = useState("0.9");
  const [historique, setHistorique] = useState([]);

  // Calcul puissance totale
  const puissanceBrute = equipements.reduce((sum, e) => sum + (parseFloat(e.puissance) || 0), 0);
  const puissanceTotale = puissanceBrute * parseFloat(coeffSimultaneite) * parseFloat(coeffUtilisation);

  // Sauvegarde historique local
  useEffect(() => {
    const savedHist = localStorage.getItem(`${STORAGE_KEY}-hist`);
    if (savedHist) {
      try {
        setHistorique(JSON.parse(savedHist));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(equipements));
    localStorage.setItem(`${STORAGE_KEY}-hist`, JSON.stringify(historique));
  }, [equipements, historique]);

  const handleEquipementChange = (idx, val) => {
    setEquipements((prev) => {
      const copy = [...prev];
      copy[idx].puissance = val;
      return copy;
    });
  };

  const handleAddEquipement = () => {
    const nom = prompt("Nom de l'équipement ?");
    if (!nom || !nom.trim()) return;
    setEquipements((prev) => [...prev, { nom: nom.trim(), puissance: "" }]);
  };

  const handleDeleteEquipement = (idx) => {
    if (!confirm(`Supprimer "${equipements[idx].nom}" ?`)) return;
    setEquipements((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (puissanceTotale <= 0) {
      alert("⚠️ Veuillez saisir au moins une puissance valide.");
      return;
    }
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      equipements: [...equipements],
      coeffSimultaneite,
      coeffUtilisation,
      puissanceBrute: puissanceBrute.toFixed(2),
      puissanceTotale: puissanceTotale.toFixed(2),
    };
    setHistorique((prev) => [entry, ...prev]);
    alert("✅ Calcul enregistré !");
  };

  const clearHistorique = () => {
    if (!confirm("🧹 Effacer tout l'historique ?")) return;
    setHistorique([]);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-800 rounded-lg shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">⚡ Puissance Totale</h2>

      <div className="space-y-4 mb-6">
        {equipements.map(({ nom, puissance }, i) => (
          <div key={i} className="flex items-center gap-3">
            <label className="w-36 font-semibold text-orange-400">{nom} (W)</label>
            <input
              type="number"
              min="0"
              step="any"
              value={puissance}
              onInput={(e) => handleEquipementChange(i, e.currentTarget.value)}
              className="flex-grow rounded-md px-3 py-2 bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-orange-400 text-right"
              placeholder="0"
            />
            <button
              onClick={() => handleDeleteEquipement(i)}
              className="text-red-500 hover:underline px-2"
              title="Supprimer"
              aria-label={`Supprimer ${nom}`}
            >
              ×
            </button>
          </div>
        ))}

        <button
          onClick={handleAddEquipement}
          className="text-green-400 hover:underline font-semibold"
          type="button"
        >
          + Ajouter équipement
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block font-semibold text-orange-400 mb-1">Coefficient de simultanéité</label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={coeffSimultaneite}
            onInput={(e) => setCoeffSimultaneite(e.currentTarget.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-orange-400 text-right"
          />
        </div>

        <div>
          <label className="block font-semibold text-orange-400 mb-1">Coefficient d’utilisation</label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={coeffUtilisation}
            onInput={(e) => setCoeffUtilisation(e.currentTarget.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-orange-400 text-right"
          />
        </div>
      </div>

      <p className="text-lg font-bold text-orange-400 mb-6 text-right">
        Puissance brute : {puissanceBrute.toFixed(2)} W<br />
        Puissance totale : {puissanceTotale.toFixed(2)} W
      </p>

      <div className="flex justify-between flex-wrap gap-3">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold shadow"
        >
          💾 Enregistrer
        </button>
        <button
          onClick={clearHistorique}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded font-semibold shadow"
        >
          🧹 Effacer historique
        </button>
        <button
          onClick={onNext}
          className="ml-auto px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded font-semibold shadow"
        >
          ▶️ Suivant
        </button>
      </div>

      {historique.length > 0 && (
        <section className="mt-6 max-h-72 overflow-y-auto bg-gray-700 rounded-md p-4 shadow-inner scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-600">
          <h3 className="text-orange-400 font-bold mb-3 text-center">🕓 Historique</h3>
          {historique.map((item) => (
            <div
              key={item.id}
              className="bg-gray-800 rounded-md p-3 mb-3 text-sm"
            >
              <time className="block text-xs text-gray-400 mb-2">{item.date}</time>
              <ul className="list-disc pl-5 space-y-1">
                {item.equipements.map(({ nom, puissance }, i) => (
                  <li key={i}>
                    {nom} : {puissance || 0} W
                  </li>
                ))}
              </ul>
              <p className="mt-2">
                Coeff simultanéité : {item.coeffSimultaneite} <br />
                Coeff utilisation : {item.coeffUtilisation} <br />
                Puissance brute : {item.puissanceBrute} W<br />
                <span className="font-semibold">Puissance totale : {item.puissanceTotale} W</span>
              </p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}


