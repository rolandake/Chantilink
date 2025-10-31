// ============================================
// 📁 domains/tp/calculators/AccotementsCalculator.js
// ============================================
import { BaseCalculator } from '../../../core/calculators/BaseCalculator';
import { DENSITIES, DOSAGES } from '../../../config/constants/common';

export class AccotementsCalculator extends BaseCalculator {
  // ✅ On valide toujours pour permettre la saisie dynamique
  validate() {
    return true;
  }

  // Calcul principal
  getResults() {
    const {
      longueur = 0,
      largeur = 0,
      epaisseur = 0,
      prixUnitaire = 0,
      coutMainOeuvre = 0
    } = this.inputs;

    const volume = parseFloat(longueur) * parseFloat(largeur) * parseFloat(epaisseur);

    // Dosages béton standard
    const dosage = DOSAGES.BETON_STANDARD || {
      ciment: 350,  // kg/m³
      sable: 0.45,   // m³/m³
      gravier: 0.82, // m³/m³
      eau: 175       // L/m³
    };

    // Calcul des matériaux
    const cimentKg = volume * dosage.ciment;
    const sableM3 = volume * dosage.sable;
    const gravierM3 = volume * dosage.gravier;
    const eauL = volume * dosage.eau;

    // Coût total
    const coutMateriaux = volume * parseFloat(prixUnitaire);
    const total = coutMateriaux + parseFloat(coutMainOeuvre);

    return {
      volume: this.formatResult(volume, 3),
      cimentKg: this.formatResult(cimentKg, 0),
      cimentT: this.formatResult(cimentKg / 1000, 3),
      sableM3: this.formatResult(sableM3, 3),
      sableT: this.formatResult(sableM3 * (DENSITIES?.SABLE || 1.6), 3),
      gravierM3: this.formatResult(gravierM3, 3),
      gravierT: this.formatResult(gravierM3 * (DENSITIES?.GRAVIER || 1.75), 3),
      eauL: this.formatResult(eauL, 0),
      coutMateriaux: this.formatResult(coutMateriaux, 2),
      total: this.formatResult(total, 2),
    };
  }

  // Méthode utilitaire pour formater les résultats
  formatResult(value, decimals = 2) {
    return Number.isFinite(value) ? parseFloat(value.toFixed(decimals)) : 0;
  }
}
