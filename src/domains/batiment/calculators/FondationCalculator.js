import { BaseCalculator } from '../../../core/calculators/BaseCalculator';
import { DENSITIES, DOSAGES } from '../../../config/constants/common';

export class FondationCalculator extends BaseCalculator {
  validate() {
    return this.validatePositiveNumbers(['longueur', 'largeur', 'hauteur']);
  }

  calculate() {
    const { longueur, largeur, hauteur, prixUnitaire = 0, coutMainOeuvre = 0 } = this.inputs;
    
    // Calcul du volume
    const volume = parseFloat(longueur) * parseFloat(largeur) * parseFloat(hauteur) || 0;
    
    // Calcul des matériaux (béton armé)
    const dosage = DOSAGES.BETON_ARME;
    const cimentKg = volume * dosage.ciment;
    const cimentT = cimentKg / 1000;
    const cimentSacs = cimentKg / 50;
    
    const sableM3 = volume * dosage.sable;
    const sableT = sableM3 * DENSITIES.SABLE;
    
    const gravierM3 = volume * dosage.gravier;
    const gravierT = gravierM3 * DENSITIES.GRAVIER;
    
    const eauL = volume * dosage.eau;
    const acierKg = volume * dosage.acier;
    const acierT = acierKg / 1000;
    
    // Coût total
    const coutMateriaux = volume * parseFloat(prixUnitaire);
    const total = coutMateriaux + parseFloat(coutMainOeuvre);

    return {
      volume: this.formatResult(volume, 3),
      cimentKg: this.formatResult(cimentKg, 0),
      cimentT: this.formatResult(cimentT, 3),
      cimentSacs: this.formatResult(cimentSacs, 1),
      sableM3: this.formatResult(sableM3, 3),
      sableT: this.formatResult(sableT, 3),
      gravierM3: this.formatResult(gravierM3, 3),
      gravierT: this.formatResult(gravierT, 3),
      eauL: this.formatResult(eauL, 0),
      acierKg: this.formatResult(acierKg, 0),
      acierT: this.formatResult(acierT, 3),
      coutMateriaux: this.formatResult(coutMateriaux, 2),
      total: this.formatResult(total, 2),
    };
  }
}
