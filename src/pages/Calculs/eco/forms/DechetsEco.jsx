import React from 'react';
import { useEffect, useState } from 'react';

const TYPES_DE_DECHETS = [
  { value: "inertes", label: "Déchets inertes" },
  { value: "recyclables", label: "Déchets recyclables" },
  { value: "dangereux", label: "Déchets dangereux" },
  { value: "autres", label: "Autres déchets" },
];

const STORAGE_KEY = "dechets-eco-history";

export default function DechetsEco({ currency = "XOF", onTotalChange = () => {} }) {
  const [typeDechet, setTypeDechet] = useState(TYPES_DE_DECHETS[0].value);
  const [quantite, setQuantite] = useState(""); // en tonnes
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [coutMainOeuvre, setCoutMainOeuvre] = useState("");
  const [historique, setHistorique] = useState([]);

  const total =
    (parseFloat(quantite) || 0) * (parseFloat(prixUnitaire) || 0) +
    (parseFloat(coutMainOeuvre) || 0);

  // Remonter total au parent
  useEffect(() => {
    onTotalChange(total);
  }, [total]);

  // Chargement historique localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistorique(JSON.parse(saved));
      } catch {}
    }
  }, []);

  // Sauvegarde historique localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historique));
  }, [historique]);

  const handleSave = () => {
    if (!quantite || total === 0) {
      alert("⚠️ Veuillez saisir une quantité et un prix valides.");
      return;
    }
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      typeDechet,
      quantite,
      prixUnitaire,
      coutMainOeuvre,
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

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">🗑️ Déchets Écologiques</h2>

      <div className="mb-6">
        <label className="block mb-1 font-semibold text-orange-400">Type de déchet</label>
        <select
          value={typeDechet}
          onChange={(e) => setTypeDechet(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-gray-200"
        >
          {TYPES_DE_DECHETS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-6">
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Quantité (t)</label>
          <input
            type="number"
            min="0"
            step="any"
            value={quantite}
            onInput={(e) => setQuantite(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            placeholder="0"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-400">Prix unitaire ({currency}/t)</label>
          <input
            type="number"
            min="0"
            step="any"
            value={prixUnitaire}
            onInput={(e) => setPrixUnitaire(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            placeholder="0"
          />
        </div>

        <div className="col-span-2">
          <label className="block mb-1 font-semibold text-orange-400">Coût main d'œuvre ({currency})</label>
          <input
            type="number"
            min="0"
            step="any"
            value={coutMainOeuvre}
            onInput={(e) => setCoutMainOeuvre(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            placeholder="0"
          />
        </div>
      </div>

      <div className="mb-6 text-right">
        <p className="text-lg font-bold text-orange-400">
          💰 Total : {total.toLocaleString()} {currency}
        </p>
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
        <section className="max-h-80 overflow-y-auto bg-gray-800 rounded-md p-4 shadow-inner scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-700">
          <h3 className="text-lg font-bold text-orange-400 mb-3 text-center">🕓 Historique</h3>
          {historique.map((item) => (
            <div
              key={item.id}
              className="bg-gray-700 rounded-md p-3 mb-3 flex justify-between items-center text-sm"
            >
              <div className="space-y-1">
                <time className="block text-xs text-gray-400">{item.date}</time>
                <p>Type : {TYPES_DE_DECHETS.find((t) => t.value === item.typeDechet)?.label}</p>
                <p>Quantité : {item.quantite} t</p>
                <p className="font-bold text-orange-300">
                  Total : {item.total} {currency}
                </p>
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


