import React from 'react';
import { useState, useEffect } from 'react';

const STORAGE_KEY = "dimension-panneaux-history";
const STORAGE_CURRENT_KEY = "dimension-panneaux-current";

export default function DimensionPanneaux({ currency = "XOF", onTotalChange = () => {}, onMaterialsChange = () => {} }) {
  const [surface, setSurface] = useState("");
  const [rendement, setRendement] = useState(18);
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [coutMainOeuvre, setCoutMainOeuvre] = useState("");
  const [coutMateriel, setCoutMateriel] = useState("");
  const [coutDivers, setCoutDivers] = useState("");
  const [historique, setHistorique] = useState([]);

  // Rechargement du dernier état sauvegardé
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistorique(JSON.parse(saved));
      } catch {}
    }

    const currentSaved = localStorage.getItem(STORAGE_CURRENT_KEY);
    if (currentSaved) {
      try {
        const data = JSON.parse(currentSaved);
        setSurface(data.surface || "");
        setRendement(data.rendement || 18);
        setPrixUnitaire(data.prixUnitaire || "");
        setCoutMainOeuvre(data.coutMainOeuvre || "");
        setCoutMateriel(data.coutMateriel || "");
        setCoutDivers(data.coutDivers || "");
      } catch (err) {
        console.error("Erreur chargement current form:", err);
      }
    }
  }, []);

  // Sauvegarde automatique dans localStorage
  useEffect(() => {
    const currentState = {
      surface,
      rendement,
      prixUnitaire,
      coutMainOeuvre,
      coutMateriel,
      coutDivers,
    };
    localStorage.setItem(STORAGE_CURRENT_KEY, JSON.stringify(currentState));
  }, [surface, rendement, prixUnitaire, coutMainOeuvre, coutMateriel, coutDivers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historique));
  }, [historique]);

  const puissance = surface && rendement ? (parseFloat(surface) * parseFloat(rendement)) / 100 : 0;
  const coutInstallation = (parseFloat(coutMainOeuvre) || 0) + (parseFloat(coutMateriel) || 0) + (parseFloat(coutDivers) || 0);
  const total = puissance * (parseFloat(prixUnitaire) || 0) + coutInstallation;

  useEffect(() => {
    onTotalChange(total);
    onMaterialsChange({
      surface: parseFloat(surface) || 0,
      puissance,
    });
  }, [total, surface, puissance]);

  const handleSave = () => {
    if (surface <= 0 || prixUnitaire <= 0) {
      alert("⚠️ Veuillez saisir des valeurs valides pour la surface et le prix unitaire.");
      return;
    }

    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      surface: parseFloat(surface).toFixed(2),
      rendement,
      puissance: puissance.toFixed(2),
      prixUnitaire: parseFloat(prixUnitaire).toFixed(2),
      coutInstallation: coutInstallation.toFixed(2),
      coutMainOeuvre: (parseFloat(coutMainOeuvre) || 0).toFixed(2),
      coutMateriel: (parseFloat(coutMateriel) || 0).toFixed(2),
      coutDivers: (parseFloat(coutDivers) || 0).toFixed(2),
      total: total.toFixed(2),
    };

    setHistorique([entry, ...historique]);
    alert("✅ Calcul sauvegardé !");
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

  const resetForm = () => {
    if (confirm("♻ Réinitialiser le formulaire ?")) {
      setSurface("");
      setRendement(18);
      setPrixUnitaire("");
      setCoutMainOeuvre("");
      setCoutMateriel("");
      setCoutDivers("");
      localStorage.removeItem(STORAGE_CURRENT_KEY);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h3 className="text-2xl font-bold text-orange-400 mb-6 text-center">📐 Dimensionnement des panneaux solaires</h3>

      <div className="grid grid-cols-2 gap-5 mb-6">
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Surface totale (m²)</label>
          <input type="number" min="0" step="any" value={surface}
            onInput={(e) => setSurface(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            placeholder="Ex: 100" />
        </div>
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Rendement (%)</label>
          <input type="number" min="0" max="100" step="any" value={rendement}
            onInput={(e) => setRendement(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            placeholder="Ex: 18" />
        </div>
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Prix unitaire ({currency} / kWc)</label>
          <input type="number" min="0" step="any" value={prixUnitaire}
            onInput={(e) => setPrixUnitaire(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            placeholder="Ex: 150000" />
        </div>
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Main d'œuvre ({currency})</label>
          <input type="number" min="0" step="any" value={coutMainOeuvre}
            onInput={(e) => setCoutMainOeuvre(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            placeholder="Ex: 200000" />
        </div>
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Matériel complémentaire ({currency})</label>
          <input type="number" min="0" step="any" value={coutMateriel}
            onInput={(e) => setCoutMateriel(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            placeholder="Ex: 100000" />
        </div>
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Frais divers ({currency})</label>
          <input type="number" min="0" step="any" value={coutDivers}
            onInput={(e) => setCoutDivers(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            placeholder="Ex: 50000" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 bg-gray-800 rounded-md p-4 mb-6 shadow-inner">
        <div>
          <p>☀️ Puissance estimée : <span className="text-orange-400 font-semibold">{puissance.toFixed(2)} kWc</span></p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-orange-400">💰 Total estimé : {total.toLocaleString()} {currency}</p>
          <p className="text-sm text-gray-400">Coût installation détaillé : {coutInstallation.toLocaleString()} {currency}</p>
        </div>
      </div>

      <div className="flex gap-3 justify-center mb-6 flex-wrap">
        <button onClick={handleSave}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold shadow">💾 Enregistrer</button>
        <button onClick={clearHistorique}
          className="px-5 py-2 bg-red-600 hover:bg-red-700 rounded-md font-semibold shadow">🧹 Effacer l'historique</button>
        <button onClick={resetForm}
          className="px-5 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md font-semibold shadow">♻ Réinitialiser</button>
      </div>

      {historique.length > 0 && (
        <section className="max-h-80 overflow-y-auto bg-gray-800 rounded-md p-4 shadow-inner scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-700">
          <h4 className="text-lg font-bold text-orange-400 mb-3 text-center">🕓 Historique</h4>
          {historique.map((item) => (
            <div key={item.id}
              className="bg-gray-700 rounded-md p-3 mb-3 flex justify-between items-center text-sm">
              <div className="space-y-1">
                <time className="block text-xs text-gray-400">{item.date}</time>
                <p>Surface : {item.surface} m²</p>
                <p>Rendement : {item.rendement} %</p>
                <p>Puissance : {item.puissance} kWc</p>
                <p>Prix unitaire : {item.prixUnitaire} {currency} / kWc</p>
                <p>Coût installation total : {item.coutInstallation} {currency}</p>
                <p> - Main d'œuvre : {item.coutMainOeuvre} {currency}</p>
                <p> - Matériel complémentaire : {item.coutMateriel} {currency}</p>
                <p> - Frais divers : {item.coutDivers} {currency}</p>
                <p className="font-bold text-orange-300">Total : {item.total} {currency}</p>
              </div>
              <button onClick={() => handleDelete(item.id)}
                className="ml-4 px-2 py-1 bg-red-600 hover:bg-red-700 rounded-md text-white font-semibold">✖</button>
            </div>
          ))}
        </section>
      )}

      <p className="text-xs text-gray-400 text-center mt-4">
        ℹ️ Estimation indicative basée sur les données saisies. Une étude sur site reste nécessaire.
      </p>
    </div>
  );
}


