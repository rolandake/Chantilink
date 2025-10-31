import { BaseCalculator } from '../../../core/calculators/BaseCalculator';

export class VoiesCalculator extends BaseCalculator {
  validate() {
    return this.validatePositiveNumbers(['longueur', 'ecartement']);
  }

  calculate() {
    const { longueur, ecartement, prixUnitaire = 0 } = this.inputs;
    
    // TODO: Implémenter la logique de calcul spécifique
    const resultat = 0;
    const total = resultat * parseFloat(prixUnitaire);

    return {
      resultat: this.formatResult(resultat, 2),
      total: this.formatResult(total, 2),
    };
  }
}
