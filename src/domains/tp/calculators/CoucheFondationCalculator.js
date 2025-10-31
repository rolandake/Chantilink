import { BaseCalculator } from '../../../core/calculators/BaseCalculator';
import { DENSITIES, DOSAGES } from '../../../config/constants/common';

export class CoucheFondationCalculator extends BaseCalculator {
  validate() {
    return this.validatePositiveNumbers(['longueur', 'largeur', 'epaisseur']);
  }

  calculate() {
    const { 
      longueur, 
      largeur, 
      epaisseur, 
      prixUnitaire = 0, 
      coutMainOeuvre = 0 
    } = this.inputs;
    
    // Calcul de la surface et du volume
    const surface = parseFloat(longueur) * parseFloat(largeur);
    const volume = surface * parseFloat(epaisseur);
    
    // Matériaux selon dosage béton armé
    const dosage = DOSAGES.BETON_ARME;
    const cimentKg = volume * dosage.ciment;
    const sableM3 = volume * dosage.sable;
    const gravierM3 = volume * dosage.gravier;
    const acierKg = volume * dosage.acier;
    
    const sableT = sableM3 * DENSITIES.SABLE;
    const gravierT = gravierM3 * DENSITIES.GRAVIER;
    
    // Coût total
    const coutMateriaux = volume * parseFloat(prixUnitaire);
    const total = coutMateriaux + parseFloat(coutMainOeuvre);

    return {
      surface: this.formatResult(surface, 2),
      volume: this.formatResult(volume, 3),
      cimentKg: this.formatResult(cimentKg, 0),
      cimentT: this.formatResult(cimentKg / 1000, 3),
      sableM3: this.formatResult(sableM3, 3),
      sableT: this.formatResult(sableT, 3),
      gravierM3: this.formatResult(gravierM3, 3),
      gravierT: this.formatResult(gravierT, 3),
      acierKg: this.formatResult(acierKg, 0),
      acierT: this.formatResult(acierKg / 1000, 3),
      coutMateriaux: this.formatResult(coutMateriaux, 2),
      total: this.formatResult(total, 2),
    };
  }
}