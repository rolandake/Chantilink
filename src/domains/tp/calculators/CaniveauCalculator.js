import { BaseCalculator } from '../../../core/calculators/BaseCalculator';
import { DENSITIES, DOSAGES } from '../../../config/constants/common';

export class CaniveauCalculator extends BaseCalculator {
  validate() {
    return this.validatePositiveNumbers(['longueur', 'largeur', 'profondeur', 'quantite']);
  }

  calculate() {
    const { 
      longueur, 
      largeur, 
      profondeur, 
      quantite = 1,
      prixUnitaire = 0, 
      coutMainOeuvre = 0 
    } = this.inputs;
    
    // Calcul du volume total
    const volume = parseFloat(longueur) * parseFloat(largeur) * parseFloat(profondeur) * parseFloat(quantite);
    
    // Matériaux selon dosage béton armé
    const dosage = DOSAGES.BETON_ARME;
    const cimentKg = volume * dosage.ciment;
    const cimentSacs = cimentKg / 50; // 50 kg par sac
    const sableM3 = volume * dosage.sable;
    const gravierM3 = volume * dosage.gravier;
    const acierKg = volume * dosage.acier;
    
    // Coût total
    const total = volume * parseFloat(prixUnitaire) + parseFloat(coutMainOeuvre);

    return {
      volume: this.formatResult(volume, 3),
      cimentKg: this.formatResult(cimentKg, 0),
      cimentSacs: this.formatResult(cimentSacs, 1),
      cimentT: this.formatResult(cimentKg / 1000, 3),
      sableM3: this.formatResult(sableM3, 3),
      sableT: this.formatResult(sableM3 * DENSITIES.SABLE, 3),
      gravierM3: this.formatResult(gravierM3, 3),
      gravierT: this.formatResult(gravierM3 * DENSITIES.GRAVIER, 3),
      acierKg: this.formatResult(acierKg, 1),
      acierT: this.formatResult(acierKg / 1000, 3),
      total: this.formatResult(total, 2),
    };
  }
}