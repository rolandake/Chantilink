import { BaseCalculator } from '../../../core/calculators/BaseCalculator';
import { DENSITIES } from '../../../config/constants/common';

const PROP_GRAVIER = 0.7;
const PROP_SABLE = 0.3;

export class CoucheBaseCalculator extends BaseCalculator {
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
    
    // Calcul des matériaux (gravier et sable)
    const gravierM3 = volume * PROP_GRAVIER;
    const sableM3 = volume * PROP_SABLE;
    
    const gravierT = gravierM3 * DENSITIES.GRAVIER; // 1.75 ou 1.8
    const sableT = sableM3 * DENSITIES.SABLE; // 1.6
    
    // Coût total
    const coutMateriaux = volume * parseFloat(prixUnitaire);
    const total = coutMateriaux + parseFloat(coutMainOeuvre);

    return {
      surface: this.formatResult(surface, 2),
      volume: this.formatResult(volume, 3),
      gravierM3: this.formatResult(gravierM3, 3),
      gravierT: this.formatResult(gravierT, 3),
      sableM3: this.formatResult(sableM3, 3),
      sableT: this.formatResult(sableT, 3),
      coutMateriaux: this.formatResult(coutMateriaux, 2),
      total: this.formatResult(total, 2),
    };
  }
}