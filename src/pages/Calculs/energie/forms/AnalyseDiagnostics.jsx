import React from 'react';
import { useEffect, useState } from 'react';

const STORAGE_KEY = "audit-analyse-history";

export default function AnalyseDiagnostics({ currency = "XOF", onTotalChange = () => {}, onDataChange = () => {} }) {
  const [diagnostic, setDiagnostic] = useState("");
  const [ameliorations, setAmeliorations] = useState("");
  const [coutAmelioration, setCoutAmelioration] = useState("");
  const [economiesEstimees, setEconomiesEstimees] = useState("");
  const [historique, setHistorique] = useState([]);

  const coutTotal = parseFloat(coutAmelioration) || 0;
  const economies = parseFloat(economiesEstimees) || 0;
  const retourInvestissement = coutTotal > 0 ? (economies / coutTotal) * 100 : 0;

  useEffect(() => {
    onTotalChange(coutTotal);
    onDataChange({ diagnostic, ameliorations, coutAmelioration, economiesEstimees, retourInvestissement });
  }, [diagnostic, ameliorations, coutAmelioration, economiesEstimees, retourInvestissement, coutTotal]);

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
    if (!diagnostic.trim()) {
      alert("⚠️ Veuillez saisir un diagnostic.");
      return;
    }
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      diagnostic,
      ameliorations,
      coutAmelioration,
      economiesEstimees,
      retourInvestissement: retourInvestissement.toFixed(2),
    };
    setHistorique([entry, ...historique]);
    alert("✅ Analyse enregistrée !");
  };

  const handleDelete = (id) => {
    if (confirm("🗑️ Supprimer cette analyse ?")) {
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
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">🔍 Analyse et diagnostics</h2>

      <div className="mb-6">
        <label className="block mb-1 font-semibold text-orange-400">Diagnostic énergétique</label>
        <textarea
          rows="3"
          value={diagnostic}
          onInput={(e) => setDiagnostic(e.target.value)}
          className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
          placeholder="Décrivez le diagnostic"
        />
      </div>

      <div className="mb-6">
        <label className="block mb-1 font-semibold text-orange-400">Améliorations proposées</label>
        <textarea
          rows="3"
          value={ameliorations}
          onInput={(e) => setAmeliorations(e.target.value)}
          className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
          placeholder="Décrivez les améliorations"
        />
      </div>

      <div className="grid grid-cols-2 gap-5 mb-6">
        {[
          { label: `Coût estimé des améliorations (${currency})`, value: coutAmelioration, setter: setCoutAmelioration },
          { label: `Économies annuelles estimées (${currency})`, value: economiesEstimees, setter: setEconomiesEstimees },
        ].map(({ label, value, setter }, idx) => (
          <div key={idx}>
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

      <div className="mb-6 text-right text-orange-400 font-semibold">
        Retour sur investissement estimé : {retourInvestissement.toFixed(2)} %
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
                <p><strong>Diagnostic :</strong> {item.diagnostic}</p>
                <p><strong>Améliorations :</strong> {item.ameliorations}</p>
                <p>Coût améliorations : {item.coutAmelioration} {currency}</p>
                <p>Économies estimées : {item.economiesEstimees} {currency}</p>
                <p>Retour sur investissement : {item.retourInvestissement} %</p>
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


