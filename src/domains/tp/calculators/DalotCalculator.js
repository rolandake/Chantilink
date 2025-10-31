import { BaseCalculator } from "../../../core/calculators/BaseCalculator";

const DENSITY_BETON = 2.4; // t/m³
const DOSAGES = {
  "béton armé": { cimentKgParM3: 350, sableM3ParM3: 0.43, gravierM3ParM3: 0.85, acierKgParM3: 100 },
  "préfabriqué": { cimentKgParM3: 320, sableM3ParM3: 0.4, gravierM3ParM3: 0.8, acierKgParM3: 50 },
  "acier": { cimentKgParM3: 0, sableM3ParM3: 0, gravierM3ParM3: 0, acierKgParM3: 500 },
};

export class DalotCalculator extends BaseCalculator {
  validate() {
    return this.validatePositiveNumbers(["longueur", "largeur", "hauteur", "quantite"]);
  }

  calculate() {
    const {
      typeDalot = "béton armé",
      longueur = 0,
      largeur = 0,
      hauteur = 0,
      quantite = 1,
      prixUnitaire = 0,
      coutMainOeuvre = 0,
    } = this.inputs;

    const l = parseFloat(longueur);
    const L = parseFloat(largeur);
    const h = parseFloat(hauteur);
    const q = parseFloat(quantite);

    const volume = l * L * h * q;
    const densite = DENSITY_BETON;
    const poidsTonnes = volume * densite;

    const dosage = DOSAGES[typeDalot] || DOSAGES["béton armé"];
    const cimentKg = volume * dosage.cimentKgParM3;
    const sableM3 = volume * dosage.sableM3ParM3;
    const gravierM3 = volume * dosage.gravierM3ParM3;
    const acierKg = volume * dosage.acierKgParM3;

    const total = volume * parseFloat(prixUnitaire) + parseFloat(coutMainOeuvre);

    return {
      volume: this.formatResult(volume, 3),
      poidsTonnes: this.formatResult(poidsTonnes, 2),
      cimentKg: this.formatResult(cimentKg, 0),
      sableM3: this.formatResult(sableM3, 2),
      gravierM3: this.formatResult(gravierM3, 2),
      acierKg: this.formatResult(acierKg, 0),
      total: this.formatResult(total, 2),
    };
  }
}
