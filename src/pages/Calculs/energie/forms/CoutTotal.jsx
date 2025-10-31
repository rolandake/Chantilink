import React from 'react';
import { useState, useEffect } from 'react';

const STORAGE_KEY = "cout-total-history";

export default function CoutTotal({ onNext = () => {} }) {
  const [materiaux, setMateriaux] = useState([
    { nom: "Câbles", quantite: "", prixUnitaire: "" },
    { nom: "Armoires électriques", quantite: "", prixUnitaire: "" },
    { nom: "Protections", quantite: "", prixUnitaire: "" },
    { nom: "Transformateurs", quantite: "", prixUnitaire: "" },
  ]);
  const [mainOeuvre, setMainOeuvre] = useState("");
  const [historique, setHistorique] = useState([]);

  const totalMateriel = materiaux.reduce((acc, item) => {
    const q = parseFloat(item.quantite);
    const p = parseFloat(item.prixUnitaire);
    return acc + (isNaN(q) || isNaN(p) ? 0 : q * p);
  }, 0);

  const totalGlobal = totalMateriel + (parseFloat(mainOeuvre) || 0);

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

  const updateMateriaux = (index, field, value) => {
    const updated = [...materiaux];
    updated[index][field] = value;
    setMateriaux(updated);
  };

  const handleSave = () => {
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      materiaux,
      mainOeuvre,
      total: totalGlobal.toFixed(2),
    };
    setHistorique([entry, ...historique]);
    alert("✅ Coût sauvegardé !");
  };

  const handleDelete = (id) => {
    if (confirm("🗑️ Supprimer ?")) {
      setHistorique(historique.filter((e) => e.id !== id));
    }
  };

  const clearHistorique = () => {
    if (confirm("🧹 Vider l'historique ?")) {
      setHistorique([]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-800 text-gray-100 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">💰 Coût Total du Projet</h2>

      <div className="space-y-4 mb-6">
        {materiaux.map((item, idx) => (
          <div key={idx} className="grid grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-orange-400">{item.nom}</label>
              <input
                type="number"
                min="0"
                value={item.quantite}
                onInput={(e) => updateMateriaux(idx, "quantite", e.currentTarget.value)}
                className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600"
                placeholder="Quantité"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-orange-400">Prix unitaire (XOF)</label>
              <input
                type="number"
                min="0"
                value={item.prixUnitaire}
                onInput={(e) => updateMateriaux(idx, "prixUnitaire", e.currentTarget.value)}
                className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600"
                placeholder="Prix"
              />
            </div>
            <div className="text-right text-green-400 font-semibold">
              {(parseFloat(item.quantite) * parseFloat(item.prixUnitaire) || 0).toLocaleString()} XOF
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <label className="block mb-1 font-semibold text-orange-400">Coût main d'œuvre (XOF)</label>
        <input
          type="number"
          min="0"
          value={mainOeuvre}
          onInput={(e) => setMainOeuvre(e.currentTarget.value)}
          className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600"
          placeholder="Main d'œuvre"
        />
      </div>

      <div className="bg-gray-700 p-4 rounded shadow-inner text-lg mb-6">
        🧾 Total matériel :{" "}
        <span className="text-green-400 font-bold">{totalMateriel.toLocaleString()} XOF</span><br />
        👷‍♂️ Main d'œuvre :{" "}
        <span className="text-blue-400 font-bold">{(parseFloat(mainOeuvre) || 0).toLocaleString()} XOF</span><br />
        💰 <span className="text-orange-400 font-bold text-xl">Total général : {totalGlobal.toLocaleString()} XOF</span>
      </div>

      <div className="flex gap-3 justify-between flex-wrap mb-6">
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
          🧹 Effacer
        </button>
        <button
          onClick={onNext}
          className="ml-auto px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded font-semibold shadow"
        >
          ✅ Terminer
        </button>
      </div>

      {historique.length > 0 && (
        <section className="max-h-72 overflow-y-auto bg-gray-700 rounded-md p-4 shadow-inner scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-600">
          <h3 className="text-orange-400 font-bold mb-3 text-center">🕓 Historique</h3>
          {historique.map((item) => (
            <div key={item.id} className="bg-gray-800 rounded-md p-3 mb-3 text-sm">
              <time className="text-xs block text-gray-400 mb-2">{item.date}</time>
              {item.materiaux.map((m, i) => (
                <p key={i}>{m.nom} : {m.quantite} × {m.prixUnitaire} = {(m.quantite * m.prixUnitaire).toLocaleString()} XOF</p>
              ))}
              <p>Main d'œuvre : {parseFloat(item.mainOeuvre).toLocaleString()} XOF</p>
              <p className="text-orange-400 font-bold">Total : {item.total} XOF</p>
              <button
                onClick={() => handleDelete(item.id)}
                className="mt-2 px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-white font-semibold"
              >
                ✖ Supprimer
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}


