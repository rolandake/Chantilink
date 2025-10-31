import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function CaniveauForm({ currency = "XOF" }) {
  const [longueur, setLongueur] = useState(0);
  const [largeur, setLargeur] = useState(0);
  const [profondeur, setProfondeur] = useState(0);
  const [quantite, setQuantite] = useState(1);
  const [prixUnitaire, setPrixUnitaire] = useState(0);
  const [coutMainOeuvre, setCoutMainOeuvre] = useState(0);
  const [historique, setHistorique] = useState([]);

  // Chargement de l'historique depuis le storage
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const result = await window.storage.get('caniveau-history');
        if (result) {
          setHistorique(JSON.parse(result.value));
        }
      } catch (error) {
        console.log('Aucun historique trouvé');
      }
    };
    loadHistory();
  }, []);

  // Sauvegarde de l'historique dans le storage
  useEffect(() => {
    const saveHistory = async () => {
      if (historique.length > 0) {
        try {
          await window.storage.set('caniveau-history', JSON.stringify(historique));
        } catch (error) {
          console.error('Erreur lors de la sauvegarde:', error);
        }
      }
    };
    saveHistory();
  }, [historique]);

  const { volume, cimentKg, cimentSacs, cimentT, sableM3, sableT, gravierM3, gravierT, acierKg, acierT, total } = useMemo(() => {
    const vol = longueur > 0 && largeur > 0 && profondeur > 0 && quantite > 0
      ? longueur * largeur * profondeur * quantite
      : 0;

    // Dosages béton armé
    const cimentKgCalc = vol * 300;
    const cimentSacsCalc = cimentKgCalc / 50;
    const cimentTCalc = cimentKgCalc / 1000;

    const sableM3Calc = vol * 0.45;
    const sableTCalc = sableM3Calc * 1.6;

    const gravierM3Calc = vol * 0.8;
    const gravierTCalc = gravierM3Calc * 1.75;

    const acierKgCalc = vol * 70;
    const acierTCalc = acierKgCalc / 1000;

    const totalCalc = vol * prixUnitaire + coutMainOeuvre;

    return {
      volume: vol,
      cimentKg: cimentKgCalc,
      cimentSacs: cimentSacsCalc,
      cimentT: cimentTCalc,
      sableM3: sableM3Calc,
      sableT: sableTCalc,
      gravierM3: gravierM3Calc,
      gravierT: gravierTCalc,
      acierKg: acierKgCalc,
      acierT: acierTCalc,
      total: totalCalc,
    };
  }, [longueur, largeur, profondeur, quantite, prixUnitaire, coutMainOeuvre]);

  const handleSave = () => {
    if (volume === 0) return alert("⚠️ Veuillez saisir des dimensions valides.");

    const entry = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      longueur,
      largeur,
      profondeur,
      quantite,
      volume: volume.toFixed(3),
      cimentKg: cimentKg.toFixed(0),
      cimentSacs: cimentSacs.toFixed(1),
      cimentT: cimentT.toFixed(3),
      sableM3: sableM3.toFixed(3),
      sableT: sableT.toFixed(3),
      gravierM3: gravierM3.toFixed(3),
      gravierT: gravierT.toFixed(3),
      acierKg: acierKg.toFixed(1),
      acierT: acierT.toFixed(3),
      prixUnitaire,
      coutMainOeuvre,
      total: total.toFixed(2),
    };

    setHistorique([entry, ...historique]);
  };

  const handleDelete = (id) => {
    if (confirm("🗑️ Supprimer cette entrée ?")) {
      setHistorique(historique.filter((item) => item.id !== id));
    }
  };

  const clearHistorique = async () => {
    if (confirm("🧹 Vider tout l'historique ?")) {
      setHistorique([]);
      try {
        await window.storage.delete('caniveau-history');
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  return (
    <div className="p-6 bg-gray-900 rounded-xl shadow-xl text-gray-100 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">Caniveau</h2>

      {/* Formulaire */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { label: "Longueur (m)", value: longueur, setter: setLongueur },
          { label: "Largeur (m)", value: largeur, setter: setLargeur },
          { label: "Profondeur (m)", value: profondeur, setter: setProfondeur },
          { label: "Quantité", value: quantite, setter: setQuantite },
          { label: `Prix unitaire (${currency} / m³)`, value: prixUnitaire, setter: setPrixUnitaire },
          { label: `Coût main d'œuvre (${currency})`, value: coutMainOeuvre, setter: setCoutMainOeuvre, full: true },
        ].map(({ label, value, setter, full }, i) => (
          <div className={full ? "col-span-2" : ""} key={i}>
            <label className="block mb-1 font-semibold text-orange-400">{label}</label>
            <input
              type="number"
              min="0"
              step="any"
              value={value}
              onChange={(e) => setter(Number(e.target.value))}
              className="w-full rounded-md px-3 py-2 bg-gray-800 border border-gray-600 focus:ring-2 focus:ring-orange-400 transition-all duration-200"
              placeholder="0"
            />
          </div>
        ))}
      </div>

      {/* Résultats */}
      <div className="bg-gray-800 p-5 rounded-xl mb-6 grid grid-cols-2 text-gray-300 gap-4">
        <div className="space-y-1">
          <p>📦 Volume total : <span className="text-orange-400 font-semibold">{volume.toFixed(3)} m³</span></p>
          <p>🧱 Ciment : {cimentKg.toFixed(0)} kg / {cimentSacs.toFixed(1)} sacs / <span className="text-green-400 font-semibold">{cimentT.toFixed(3)} t</span></p>
          <p>🏖️ Sable : {sableM3.toFixed(3)} m³ / <span className="text-green-400 font-semibold">{sableT.toFixed(3)} t</span></p>
          <p>🪨 Gravier : {gravierM3.toFixed(3)} m³ / <span className="text-green-400 font-semibold">{gravierT.toFixed(3)} t</span></p>
          <p>⚙️ Acier : {acierKg.toFixed(1)} kg / <span className="text-green-400 font-semibold">{acierT.toFixed(3)} t</span></p>
        </div>
        <div className="text-right text-xl font-bold text-orange-400 flex items-center justify-end">
          Coût total : {isNaN(total) ? 0 : total.toLocaleString()} {currency}
        </div>
      </div>

      {/* Boutons */}
      <div className="flex gap-4 justify-center mb-6 flex-wrap">
        <button
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded transition-all transform hover:scale-105"
        >
          💾 Enregistrer
        </button>
        <button
          onClick={clearHistorique}
          className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2 rounded transition-all transform hover:scale-105"
        >
          🧹 Effacer historique
        </button>
      </div>

      {/* Historique animé */}
      <AnimatePresence>
        {historique.length > 0 ? (
          <section className="max-h-80 overflow-y-auto bg-gray-800 rounded-xl p-4 space-y-3">
            <h3 className="text-orange-400 font-bold mb-3 text-center">Historique</h3>
            {historique.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4 }}
                className="bg-gray-700 p-3 rounded-lg flex justify-between items-center shadow-md"
              >
                <div className="space-y-0.5 text-sm">
                  <time className="block text-xs text-gray-400">{item.date}</time>
                  <p>Volume : {item.volume} m³</p>
                  <p>Ciment : {item.cimentKg} kg / {item.cimentSacs} sacs / {item.cimentT} t</p>
                  <p>Sable : {item.sableM3} m³ / {item.sableT} t</p>
                  <p>Gravier : {item.gravierM3} m³ / {item.gravierT} t</p>
                  <p>Acier : {item.acierKg} kg / {item.acierT} t</p>
                  <p className="font-bold text-orange-300">Coût total : {item.total} {currency}</p>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-500 hover:text-red-700 font-bold text-lg"
                >
                  ✖
                </button>
              </motion.div>
            ))}
          </section>
        ) : (
          <p className="text-center text-gray-500">📭 Aucun calcul enregistré pour l'instant.</p>
        )}
      </AnimatePresence>
    </div>
  );
}