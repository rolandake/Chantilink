import React, { useState, useEffect } from 'react';
import jsPDF from "jspdf";

const STORAGE_KEY = "conception-preliminaire-history";

export default function ConceptionPreliminaire({ onStatusChange = () => {} }) {
  const [description, setDescription] = useState("");
  const [plansDisponibles, setPlansDisponibles] = useState(false);
  const [delaiPrevu, setDelaiPrevu] = useState("");
  const [etat, setEtat] = useState("Non commencé");
  const [historique, setHistorique] = useState([]);

  useEffect(() => {
    onStatusChange(etat);
  }, [etat]);

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
    if (!description.trim() || !delaiPrevu) {
      alert("⚠️ Veuillez remplir tous les champs.");
      return;
    }

    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      description,
      plansDisponibles,
      delaiPrevu,
      etat,
    };

    setHistorique([entry, ...historique]);
    alert("✅ Conception préliminaire sauvegardée !");
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

  // --- Fonction export PDF ---
  const exportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Conception Préliminaire", 10, 20);

    doc.setFontSize(12);
    doc.text(`Description :`, 10, 40);
    doc.text(description || "Aucune description saisie", 10, 50);

    doc.text(`Plans disponibles : ${plansDisponibles ? "Oui" : "Non"}`, 10, 70);
    doc.text(`Délai prévu : ${delaiPrevu || "Non renseigné"}`, 10, 90);
    doc.text(`État : ${etat}`, 10, 110);

    doc.save("ConceptionPreliminaire.pdf");
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-lg shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">📝 Conception préliminaire</h2>

      <div className="grid grid-cols-1 gap-5 mb-6">
        <div>
          <label className="block mb-1 font-semibold text-orange-400">Description</label>
          <textarea
            rows="4"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            placeholder="Détails sur la conception préliminaire"
          />
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="plansDisponibles"
            checked={plansDisponibles}
            onChange={(e) => setPlansDisponibles(e.target.checked)}
            className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-orange-400 focus:ring-orange-400"
          />
          <label htmlFor="plansDisponibles" className="font-semibold text-orange-400 select-none">
            Plans disponibles
          </label>
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-400">Délai prévu</label>
          <input
            type="text"
            value={delaiPrevu}
            onChange={(e) => setDelaiPrevu(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
            placeholder="Ex : 3 mois"
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-orange-400">État</label>
          <select
            value={etat}
            onChange={(e) => setEtat(e.target.value)}
            className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-orange-400"
          >
            <option>Non commencé</option>
            <option>En cours</option>
            <option>Terminé</option>
            <option>En pause</option>
          </select>
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
        <button
          onClick={exportPDF}
          className="px-5 py-2 bg-green-600 hover:bg-green-700 rounded-md font-semibold shadow"
        >
          📄 Exporter PDF
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
                <p><strong>Description:</strong> {item.description}</p>
                <p><strong>Plans disponibles:</strong> {item.plansDisponibles ? "Oui" : "Non"}</p>
                <p><strong>Délai prévu:</strong> {item.delaiPrevu}</p>
                <p><strong>État:</strong> {item.etat}</p>
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
