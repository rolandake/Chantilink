import { BaseCalculator } from '../../../core/calculators/BaseCalculator';

export class CoucheFormeCalculator extends BaseCalculator {
  // Constantes pour les densités
  static DENSITE_SABLE = 1.6;
  static DENSITE_GRAVIER = 1.8;
  static DENSITE_TERRE_STAB = 1.9;

  // Proportions des matériaux
  static PROP_SABLE = 0.4;
  static PROP_GRAVIER = 0.2;
  static PROP_TERRE = 0.4;

  validate() {
    return this.validatePositiveNumbers(['surface', 'epaisseur']);
  }

  calculate() {
    const { surface, epaisseur, prixUnitaire = 0, mainOeuvre = 0 } = this.inputs;
    
    // Calcul du volume total
    const surfaceVal = parseFloat(surface);
    const epaisseurVal = parseFloat(epaisseur);
    const volume = surfaceVal * epaisseurVal;
    
    // Calcul des volumes par matériau (m³)
    const sableM3 = volume * CoucheFormeCalculator.PROP_SABLE;
    const gravierM3 = volume * CoucheFormeCalculator.PROP_GRAVIER;
    const terreM3 = volume * CoucheFormeCalculator.PROP_TERRE;
    
    // Calcul des masses (tonnes)
    const sableT = sableM3 * CoucheFormeCalculator.DENSITE_SABLE;
    const gravierT = gravierM3 * CoucheFormeCalculator.DENSITE_GRAVIER;
    const terreT = terreM3 * CoucheFormeCalculator.DENSITE_TERRE_STAB;
    
    // Coût total
    const coutMateriaux = volume * parseFloat(prixUnitaire);
    const total = coutMateriaux + parseFloat(mainOeuvre);

    return {
      volume: this.formatResult(volume, 3),
      sableM3: this.formatResult(sableM3, 3),
      gravierM3: this.formatResult(gravierM3, 3),
      terreM3: this.formatResult(terreM3, 3),
      sableT: this.formatResult(sableT, 3),
      gravierT: this.formatResult(gravierT, 3),
      terreT: this.formatResult(terreT, 3),
      coutMateriaux: this.formatResult(coutMateriaux, 2),
      total: this.formatResult(total, 2),
    };
  }
}