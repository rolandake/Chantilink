
// ============================================
// 📁 CoucheRoulForm.jsx - Avec CalculationContext
// ============================================

export function CoucheRoulForm({ currency = "FCFA", onTotalChange = () => {} }) {
  const {
    localInputs,
    updateInput,
    updateMultipleInputs,
    saveCalculation,
    fetchSavedCalculations,
    savedCalculations,
    loading,
    setCalculationType,
    PROJECT_TYPES,
  } = useCalculation();

  useEffect(() => {
    setCalculationType(PROJECT_TYPES.TP, 'couche_roulement');
    fetchSavedCalculations({
      projectType: PROJECT_TYPES.TP,
      calculationType: 'couche_roulement'
    });

    if (!localInputs.surface) {
      updateMultipleInputs({
        surface: "",
        epaisseur: "",
        prixUnitaire: "",
        mainOeuvre: "",
      });
    }
  }, []);

  const results = useMemo(() => {
    const surface = parseFloat(localInputs.surface) || 0;
    const epaisseur = parseFloat(localInputs.epaisseur) || 0;
    const prixUnitaire = parseFloat(localInputs.prixUnitaire) || 0;
    const mainOeuvre = parseFloat(localInputs.mainOeuvre) || 0;

    const volume = surface * epaisseur;
    const poidsTotal = (volume * 2.35).toFixed(2); // Densité enrobé
    const poidsBitume = (poidsTotal * 0.07).toFixed(2);
    const poidsGranulats = (poidsTotal - poidsBitume).toFixed(2);
    const total = volume * prixUnitaire + mainOeuvre;

    return { volume: volume.toFixed(3), poidsTotal, poidsBitume, poidsGranulats, total: total.toFixed(2) };
  }, [localInputs]);

  useEffect(() => {
    onTotalChange(Number(results.total));
  }, [results.total, onTotalChange]);

  const handleSave = async () => {
    if (results.volume == 0) {
      alert("⚠️ Veuillez entrer des dimensions valides.");
      return;
    }
    
    await saveCalculation(
      { inputs: localInputs, results },
      PROJECT_TYPES.TP,
      'couche_roulement'
    );

    fetchSavedCalculations({
      projectType: PROJECT_TYPES.TP,
      calculationType: 'couche_roulement'
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-xl shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">🛣️ Couche de roulement</h2>

      <div className="grid grid-cols-2 gap-5 mb-6">
        {[
          { name: "surface", label: "Surface (m²)", placeholder: "Ex : 150" },
          { name: "epaisseur", label: "Épaisseur (m)", placeholder: "Ex : 0.12" },
          { name: "prixUnitaire", label: `Prix unitaire (${currency} / m³)`, placeholder: "Ex : 8500" },
          { name: "mainOeuvre", label: `Coût main d'œuvre (${currency})`, placeholder: "Ex : 90000", full: true },
        ].map(({ name, label, placeholder, full }, i) => (
          <div className={full ? "col-span-2" : ""} key={i}>
            <label className="block mb-1 font-semibold text-orange-400">{label}</label>
            <input
              type="number"
              min="0"
              step="any"
              value={localInputs[name] || ""}
              onChange={(e) => updateInput(name, e.target.value)}
              placeholder={placeholder}
              disabled={loading}
              className="w-full rounded-md px-4 py-2 bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
            />
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-lg p-5 mb-6 shadow-inner border border-gray-700 space-y-1">
        <p>📦 Volume : <span className="text-orange-400 font-semibold">{results.volume} m³</span></p>
        <p>⚖️ Poids total enrobé : <span className="text-green-400 font-semibold">{results.poidsTotal} t</span></p>
        <p>🛢️ Bitume (7%) : <span className="text-green-400 font-semibold">{results.poidsBitume} t</span></p>
        <p>🪨 Granulats : <span className="text-green-400 font-semibold">{results.poidsGranulats} t</span></p>
        <p className="text-lg font-bold text-orange-400">💰 Coût total : {Number(results.total).toLocaleString()} {currency}</p>
      </div>

      <div className="flex justify-center mb-8">
        <button onClick={handleSave} disabled={loading} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg font-bold">
          {loading ? '⏳' : '💾'} Sauvegarder
        </button>
      </div>

      {savedCalculations.length > 0 && (
        <section className="max-h-80 overflow-y-auto bg-gray-800 rounded-lg p-4">
          <h3 className="text-xl font-bold text-orange-400 mb-4 text-center">🕓 Historique</h3>
          {savedCalculations.map((item) => (
            <div key={item._id} className="bg-gray-700 rounded-lg p-4 mb-3 text-sm">
              <time className="block text-xs text-gray-400">{new Date(item.savedAt).toLocaleString('fr-FR')}</time>
              <p>Volume : {item.results?.volume} m³</p>
              <p>Poids total : {item.results?.poidsTotal} t</p>
              <p className="font-bold text-orange-300">Coût total : {item.results?.total} {currency}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}