
// ============================================
// 📁 CoucheFondationForm.jsx - Avec CalculationContext
// ============================================

const CIMENT_KG_PAR_M3 = 300;
const SABLE_M3_PAR_M3 = 0.45;
const GRAVIER_M3_PAR_M3 = 0.8;
const ACIER_KG_PAR_M3 = 70;

export function CoucheFondationForm({ currency = "FCFA", onTotalChange = () => {} }) {
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
    setCalculationType(PROJECT_TYPES.TP, 'couche_fondation');
    fetchSavedCalculations({
      projectType: PROJECT_TYPES.TP,
      calculationType: 'couche_fondation'
    });

    if (!localInputs.longueur) {
      updateMultipleInputs({
        longueur: 0,
        largeur: 0,
        epaisseur: 0,
        prixUnitaire: 0,
        coutMainOeuvre: 0,
      });
    }
  }, []);

  const results = useMemo(() => {
    const longueur = parseFloat(localInputs.longueur) || 0;
    const largeur = parseFloat(localInputs.largeur) || 0;
    const epaisseur = parseFloat(localInputs.epaisseur) || 0;
    const prixUnitaire = parseFloat(localInputs.prixUnitaire) || 0;
    const coutMainOeuvre = parseFloat(localInputs.coutMainOeuvre) || 0;

    const surf = longueur * largeur;
    const vol = surf * epaisseur;
    const gravM3 = vol * GRAVIER_M3_PAR_M3;
    const sabM3 = vol * SABLE_M3_PAR_M3;
    const gravT = gravM3 * 1.75;
    const sabT = sabM3 * 1.6;
    const cimKg = vol * CIMENT_KG_PAR_M3;
    const cimT = cimKg / 1000;
    const aciKg = vol * ACIER_KG_PAR_M3;
    const aciT = aciKg / 1000;
    const totalCalc = vol * prixUnitaire + coutMainOeuvre;

    return {
      surface: surf,
      volume: vol,
      gravierM3: gravM3,
      sableM3: sabM3,
      gravierT: gravT,
      sableT: sabT,
      cimentKg: cimKg,
      cimentT: cimT,
      acierKg: aciKg,
      acierT: aciT,
      total: totalCalc,
    };
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
      'couche_fondation'
    );

    fetchSavedCalculations({
      projectType: PROJECT_TYPES.TP,
      calculationType: 'couche_fondation'
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-gray-900 rounded-xl shadow-xl text-gray-100 font-sans">
      <h2 className="text-2xl font-bold text-orange-400 mb-6 text-center">⚡ Couche de fondation</h2>

      <div className="grid grid-cols-2 gap-5 mb-6">
        {[
          { name: "longueur", label: "Longueur (m)" },
          { name: "largeur", label: "Largeur (m)" },
          { name: "epaisseur", label: "Épaisseur (m)" },
          { name: "prixUnitaire", label: `Prix unitaire (${currency} / m³)` },
          { name: "coutMainOeuvre", label: `Coût main d'œuvre (${currency})`, full: true },
        ].map(({ name, label, full }, i) => (
          <div className={full ? "col-span-2" : ""} key={i}>
            <label className="block mb-1 font-semibold text-orange-400">{label}</label>
            <input
              type="number"
              min="0"
              step="any"
              value={localInputs[name] || 0}
              onChange={(e) => updateInput(name, e.target.value)}
              disabled={loading}
              className="w-full rounded-md px-4 py-2 bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-50"
              placeholder="0"
            />
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-xl p-5 mb-6 shadow-inner border border-gray-700 text-gray-200 space-y-2">
        <p><strong>Surface :</strong> <span className="text-blue-400">{results.surface.toFixed(2)} m²</span></p>
        <p><strong>Volume total :</strong> <span className="text-orange-400">{results.volume.toFixed(3)} m³</span></p>
        <p><strong>Ciment :</strong> {results.cimentKg.toFixed(0)} kg / <span className="text-green-400 font-semibold">{results.cimentT.toFixed(3)} t</span></p>
        <p><strong>Sable :</strong> {results.sableM3.toFixed(3)} m³ / <span className="text-green-400 font-semibold">{results.sableT.toFixed(3)} t</span></p>
        <p><strong>Gravier :</strong> {results.gravierM3.toFixed(3)} m³ / <span className="text-green-400 font-semibold">{results.gravierT.toFixed(3)} t</span></p>
        <p><strong>Acier :</strong> {results.acierKg.toFixed(0)} kg / <span className="text-green-400 font-semibold">{results.acierT.toFixed(3)} t</span></p>
      </div>

      <div className="text-center text-2xl font-bold text-orange-400 mb-8">
        💰 Coût total : {results.total.toLocaleString("fr-FR")} {currency}
      </div>

      <div className="flex flex-wrap justify-center gap-4 mb-8">
        <button
          onClick={handleSave}
          disabled={loading || results.volume === 0}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-xl font-bold shadow-md transition"
        >
          {loading ? '⏳' : '💾'} Sauvegarder
        </button>
      </div>

      {savedCalculations.length > 0 && (
        <section className="max-h-80 overflow-y-auto bg-gray-800 rounded-xl p-4">
          <h3 className="text-xl font-bold text-orange-400 mb-4 text-center">🕓 Historique</h3>
          {savedCalculations.map((item) => (
            <div key={item._id} className="bg-gray-700 rounded-lg p-4 mb-3 text-sm">
              <time className="block text-xs text-gray-400">{new Date(item.savedAt).toLocaleString('fr-FR')}</time>
              <p>Volume : {item.results?.volume} m³</p>
              <p>Ciment : {item.results?.cimentT} t | Sable : {item.results?.sableT} t</p>
              <p className="font-bold text-orange-400">Total : {parseFloat(item.results?.total || 0).toLocaleString("fr-FR")} {currency}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}