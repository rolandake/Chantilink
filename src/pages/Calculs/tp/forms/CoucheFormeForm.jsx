
// ============================================
// 📁 CoucheFormeForm.jsx - Avec CalculationContext
// ============================================

const DENSITE_TERRE_STAB = 1.9;
const PROP_SABLE_FORME = 0.4;
const PROP_GRAVIER_FORME = 0.2;
const PROP_TERRE = 0.4;

export function CoucheFormeForm({ currency = "FCFA", onTotalChange = () => {} }) {
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
    setCalculationType(PROJECT_TYPES.TP, 'couche_forme');
    fetchSavedCalculations({
      projectType: PROJECT_TYPES.TP,
      calculationType: 'couche_forme'
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
    const sableM3 = volume * PROP_SABLE_FORME;
    const gravierM3 = volume * PROP_GRAVIER_FORME;
    const terreM3 = volume * PROP_TERRE;
    const sableT = sableM3 * 1.6;
    const gravierT = gravierM3 * 1.8;
    const terreT = terreM3 * DENSITE_TERRE_STAB;
    const total = volume * prixUnitaire + mainOeuvre;

    return { volume, sableM3, gravierM3, terreM3, sableT, gravierT, terreT, total };
  }, [localInputs]);

  useEffect(() => {
    onTotalChange(results.total);
  }, [results.total, onTotalChange]);

  const handleSave = async () => {
    if (results.volume === 0) {
      alert("⚠️ Veuillez entrer des dimensions valides.");
      return;
    }
    
    await saveCalculation(
      { inputs: localInputs, results },
      PROJECT_TYPES.TP,
      'couche_forme'
    );

    fetchSavedCalculations({
      projectType: PROJECT_TYPES.TP,
      calculationType: 'couche_forme'
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-xl shadow-lg text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">🟤 Couche de Forme</h2>

      <div className="grid grid-cols-2 gap-5 mb-6">
        {[
          { name: "surface", label: "Surface (m²)", placeholder: "Ex : 150" },
          { name: "epaisseur", label: "Épaisseur (m)", placeholder: "Ex : 0.25" },
          { name: "prixUnitaire", label: `Prix unitaire (${currency} / m³)`, placeholder: "Ex : 3500" },
          { name: "mainOeuvre", label: `Coût main d'œuvre (${currency})`, placeholder: "Ex : 50000", full: true },
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

      <div className="bg-gray-800 rounded-lg p-5 mb-6 shadow-inner border border-gray-700 text-gray-200 space-y-1">
        <p><strong>Volume :</strong> {results.volume.toFixed(3)} m³</p>
        <p><strong>Sable :</strong> {results.sableM3.toFixed(3)} m³ / <span className="text-green-400">{results.sableT.toFixed(3)} t</span></p>
        <p><strong>Gravier :</strong> {results.gravierM3.toFixed(3)} m³ / <span className="text-green-400">{results.gravierT.toFixed(3)} t</span></p>
        <p><strong>Terre stabilisée :</strong> {results.terreM3.toFixed(3)} m³ / <span className="text-green-400">{results.terreT.toFixed(3)} t</span></p>
      </div>

      <div className="text-center text-xl font-bold text-orange-400 mb-8">
        Coût total : {results.total.toLocaleString()} {currency}
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
              <p>Volume : {item.results?.volume?.toFixed(3)} m³</p>
              <p>Sable : {item.results?.sableT?.toFixed(3)} t | Gravier : {item.results?.gravierT?.toFixed(3)} t</p>
              <p className="font-bold text-orange-300">Total : {item.results?.total?.toFixed(2)} {currency}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}