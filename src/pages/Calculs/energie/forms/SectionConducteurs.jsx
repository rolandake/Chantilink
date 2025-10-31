import React from 'react';
import { useState, useEffect } from 'react';

const STORAGE_KEY = "section-conducteurs-history";

export default function SectionConducteurs({ onNext = () => {} }) {
  const [longueur, setLongueur] = useState("");
  const [intensite, setIntensite] = useState("");
  const [tension, setTension] = useState("230");
  const [materiau, setMateriau] = useState("cuivre");
  const [chuteMax, setChuteMax] = useState("5");
  const [historique, setHistorique] = useState([]);

  const resistivite = materiau === "cuivre" ? 0.017 : 0.028; // en ohm·mm²/m
  const L = parseFloat(longueur);
  const I = parseFloat(intensite);
  const U = parseFloat(tension);
  const maxChute = parseFloat(chuteMax);

  const section = I && L && U && maxChute
    ? (2 * resistivite * L * I) / (U * (maxChute / 100))
    : 0;

  const chuteReelle = section
    ? (2 * resistivite * L * I) / section
    : 0;

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
    if (!section || section <= 0) {
      alert("⚠️ Veuillez saisir des valeurs valides.");
      return;
    }

    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      longueur,
      intensite,
      tension,
      materiau,
      chuteMax,
      section: section.toFixed(2),
      chuteReelle: chuteReelle.toFixed(2),
    };
    setHistorique([entry, ...historique]);
    alert("✅ Calcul sauvegardé !");
  };

  const deleteEntry = (id) => {
    if (confirm("🗑️ Supprimer cette ligne ?")) {
      setHistorique(historique.filter((e) => e.id !== id));
    }
  };

  const clearHistorique = () => {
    if (confirm("🧹 Vider tout l'historique ?")) {
      setHistorique([]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-800 rounded-lg shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">
        📏 Dimensionnement des Conducteurs
      </h2>

      <div className="grid grid-cols-2 gap-5 mb-6">
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Longueur (m)</label>
          <input
            type="number"
            value={longueur}
            onInput={(e) => setLongueur(e.currentTarget.value)}
            className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-right"
          />
        </div>
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Intensité (A)</label>
          <input
            type="number"
            value={intensite}
            onInput={(e) => setIntensite(e.currentTarget.value)}
            className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-right"
          />
        </div>
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Tension (V)</label>
          <input
            type="number"
            value={tension}
            onInput={(e) => setTension(e.currentTarget.value)}
            className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-right"
          />
        </div>
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Matériau</label>
          <select
            value={materiau}
            onChange={(e) => setMateriau(e.currentTarget.value)}
            className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600"
          >
            <option value="cuivre">Cuivre</option>
            <option value="alu">Aluminium</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="block mb-1 font-semibold text-orange-400">Chute de tension admissible (%)</label>
          <input
            type="number"
            value={chuteMax}
            onInput={(e) => setChuteMax(e.currentTarget.value)}
            className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-right"
          />
        </div>
      </div>

      <div className="bg-gray-700 rounded p-4 mb-6 shadow-inner">
        <p>🔌 Section minimale : <span className="text-green-400 font-bold">{section.toFixed(2)} mm²</span></p>
        <p>🔻 Chute réelle : <span className="text-orange-300 font-bold">{chuteReelle.toFixed(2)} V</span></p>
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
          🧹 Vider
        </button>
        <button
          onClick={onNext}
          className="ml-auto px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded font-semibold shadow"
        >
          ▶️ Suivant
        </button>
      </div>

      {historique.length > 0 && (
        <section className="max-h-72 overflow-y-auto bg-gray-700 rounded-md p-4 shadow-inner scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-600">
          <h3 className="text-orange-400 font-bold mb-3 text-center">🕓 Historique</h3>
          {historique.map((item) => (
            <div
              key={item.id}
              className="bg-gray-800 rounded-md p-3 mb-3 text-sm flex justify-between"
            >
              <div>
                <time className="text-xs block text-gray-400 mb-1">{item.date}</time>
                <p>Longueur : {item.longueur} m</p>
                <p>Intensité : {item.intensite} A</p>
                <p>Tension : {item.tension} V</p>
                <p>Matériau : {item.materiau}</p>
                <p>Section : <span className="text-green-400 font-bold">{item.section} mm²</span></p>
                <p>Chute réelle : <span className="text-orange-300">{item.chuteReelle} V</span></p>
              </div>
              <button
                onClick={() => deleteEntry(item.id)}
                className="h-8 px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold rounded"
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


