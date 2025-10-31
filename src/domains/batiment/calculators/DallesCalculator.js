import { BaseCalculator } from '../../../core/calculators/BaseCalculator';

export class DallesCalculator extends BaseCalculator {
  validate() {
    return this.validatePositiveNumbers(['longueur', 'largeur', 'epaisseur']);
  }

  calculate() {
    const { longueur, largeur, epaisseur, prixUnitaire = 0, coutMainOeuvre = 0 } = this.inputs;
    
    // Calcul de la surface
    const surface = parseFloat(longueur) * parseFloat(largeur);
    const volume = epaisseur ? surface * parseFloat(epaisseur) : 0;
    
    // Coût total
    const coutMateriaux = surface * parseFloat(prixUnitaire);
    const total = coutMateriaux + parseFloat(coutMainOeuvre);

    return {
      surface: this.formatResult(surface, 2),
      volume: this.formatResult(volume, 3),
      coutMateriaux: this.formatResult(coutMateriaux, 2),
      total: this.formatResult(total, 2),
    };
  }
}
