import React from 'react';
import { useState, useEffect } from 'react';

const STORAGE_KEY = "etude_faisabilite_history";

export default function EtudeFaisabilite() {
  const [surfaceDispo, setSurfaceDispo] = useState("");
  const [irradiation, setIrradiation] = useState("");
  const [rendementSysteme, setRendementSysteme] = useState(75);
  const [consoAnnuelle, setConsoAnnuelle] = useState("");
  const [historique, setHistorique] = useState([]);

  const productionKwhAn =
    parseFloat(surfaceDispo) > 0 &&
    parseFloat(irradiation) > 0 &&
    parseFloat(rendementSysteme) > 0
      ? (surfaceDispo * irradiation * rendementSysteme) / 100
      : 0;

  const couverture =
    parseFloat(consoAnnuelle) > 0
      ? (productionKwhAn / consoAnnuelle) * 100
      : 0;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setHistorique(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historique));
  }, [historique]);

  const handleSave = () => {
    if (!surfaceDispo || !irradiation || !rendementSysteme) {
      alert("⚠️ Merci de remplir toutes les données principales.");
      return;
    }

    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      surfaceDispo,
      irradiation,
      rendementSysteme,
      consoAnnuelle,
      productionKwhAn: productionKwhAn.toFixed(0),
      couverture: couverture.toFixed(1),
    };

    setHistorique([entry, ...historique]);
    alert("✅ Estimation enregistrée !");
  };

  const deleteEntry = (id) => {
    if (confirm("🗑️ Supprimer cette estimation ?")) {
      setHistorique(historique.filter((h) => h.id !== id));
    }
  };

  const clearHistorique = () => {
    if (confirm("🧹 Effacer tout l'historique ?")) {
      setHistorique([]);
    }
  };

  return (
    <div className="text-sm text-gray-200 space-y-6">
      <h3 className="text-lg text-orange-400 font-bold mb-2">🔍 Étude de faisabilité</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 text-orange-300 font-semibold">
            Surface disponible (m²)
          </label>
          <input
            type="number"
            min="0"
            value={surfaceDispo}
            onInput={(e) => setSurfaceDispo(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"
            placeholder="ex : 120"
          />
        </div>

        <div>
          <label className="block mb-1 text-orange-300 font-semibold">
            Irradiation moyenne (kWh/m²/an)
          </label>
          <input
            type="number"
            min="0"
            value={irradiation}
            onInput={(e) => setIrradiation(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"
            placeholder="ex : 1800"
          />
        </div>

        <div>
          <label className="block mb-1 text-orange-300 font-semibold">
            Rendement du système (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={rendementSysteme}
            onInput={(e) => setRendementSysteme(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"
          />
        </div>

        <div>
          <label className="block mb-1 text-orange-300 font-semibold">
            Conso. annuelle estimée (kWh)
          </label>
          <input
            type="number"
            min="0"
            value={consoAnnuelle}
            onInput={(e) => setConsoAnnuelle(e.target.value)}
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700"
            placeholder="ex : 4500"
          />
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded shadow-inner space-y-2">
        <p>
          ☀️ <span className="font-semibold">Production estimée :</span>{" "}
          <span className="text-green-400 font-bold">{productionKwhAn.toFixed(0)} kWh/an</span>
        </p>
        <p>
          ⚡ <span className="font-semibold">Taux de couverture :</span>{" "}
          <span className="text-orange-300 font-bold">{couverture.toFixed(1)} %</span> de la consommation
        </p>
      </div>

      <div className="flex gap-3 justify-center flex-wrap">
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
        <section className="bg-gray-800 p-4 mt-6 rounded shadow-inner max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-orange-500 scrollbar-track-gray-700">
          <h4 className="text-center text-orange-400 font-bold mb-3">📜 Historique</h4>
          {historique.map((h) => (
            <div
              key={h.id}
              className="bg-gray-700 p-3 mb-3 rounded flex justify-between items-start text-sm"
            >
              <div>
                <p className="text-xs text-gray-400">{h.date}</p>
                <p>Surface : {h.surfaceDispo} m²</p>
                <p>Irradiation : {h.irradiation} kWh/m²/an</p>
                <p>Rendement : {h.rendementSysteme} %</p>
                <p>Consommation : {h.consoAnnuelle} kWh</p>
                <p>
                  ☀️ Prod :{" "}
                  <span className="text-green-400 font-bold">
                    {h.productionKwhAn} kWh/an
                  </span>
                </p>
                <p>
                  ⚡ Couverture :{" "}
                  <span className="text-orange-300 font-bold">{h.couverture} %</span>
                </p>
              </div>
              <button
                onClick={() => deleteEntry(h.id)}
                className="ml-3 bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-white"
              >
                ✖
              </button>
            </div>
          ))}
        </section>
      )}

      <p className="text-xs text-gray-400 text-center">
        ℹ️ Estimation indicative basée sur les données saisies. Une étude sur site reste nécessaire.
      </p>
    </div>
  );
}


