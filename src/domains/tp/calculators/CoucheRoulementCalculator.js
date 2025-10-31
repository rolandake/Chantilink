import { BaseCalculator } from "../../../core/calculators/BaseCalculator";

export class CoucheRoulementCalculator extends BaseCalculator {
  validate() {
    return this.validatePositiveNumbers(["surface", "epaisseur", "prixUnitaire"]);
  }

  calculate() {
    const { surface = 0, epaisseur = 0, prixUnitaire = 0, coutMainOeuvre = 0 } = this.inputs;

    // Volume (m³)
    const volume = parseFloat(surface) * parseFloat(epaisseur);

    // Densité enrobé (t/m³)
    const densiteEnrobe = 2.4;
    const poidsTotal = volume * densiteEnrobe;

    // Bitume 7%
    const tauxBitume = 0.07;
    const poidsBitume = poidsTotal * tauxBitume;
    const poidsGranulats = poidsTotal - poidsBitume;

    // Coût
    const coutMateriaux = volume * parseFloat(prixUnitaire);
    const total = coutMateriaux + parseFloat(coutMainOeuvre);

    return {
      volume: this.formatResult(volume, 3),
      poidsTotal: this.formatResult(poidsTotal, 2),
      poidsBitume: this.formatResult(poidsBitume, 2),
      poidsGranulats: this.formatResult(poidsGranulats, 2),
      coutMateriaux: this.formatResult(coutMateriaux, 2),
      total: this.formatResult(total, 2),
    };
  }
}
