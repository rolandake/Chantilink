// ============================================
// 📁 domains/tp/calculators/TerrassementCalculator.js
// Calculateur de terrassement pour projets TP
// ============================================

import { BaseCalculator } from '../../../core/calculators/BaseCalculator';
import { DENSITIES } from '../../../config/constants/common';

/**
 * Calculateur pour les opérations de terrassement
 * Gère: volume excavé, poids, coûts matériaux et main d'œuvre
 */
export class TerrassementCalculator extends BaseCalculator {
  constructor(inputs) {
    super(inputs, 'tp');
  }

  /**
   * Validation des inputs
   * @returns {boolean} true si valide
   */
  validate() {
    const dimensionsValid = this.validatePositiveNumbers([
      'longueur',
      'largeur',
      'profondeur'
    ]);

    if (!dimensionsValid) return false;

    const { prixUnitaire, coutMainOeuvre } = this.inputs;
    if (prixUnitaire !== undefined && prixUnitaire < 0) return false;
    if (coutMainOeuvre !== undefined && coutMainOeuvre < 0) return false;

    return true;
  }

  /**
   * Calculs principaux
   * @returns {Object} Résultats avec volume, poids et coûts
   */
  calculate() {
    const {
      longueur,
      largeur,
      profondeur,
      prixUnitaire = 0,
      coutMainOeuvre = 0
    } = this.inputs;

    const volume = this.calculateVolume();
    const poidsTonnes = volume * DENSITIES.TERRE;
    const coutMateriaux = volume * this.parseNumber(prixUnitaire);
    const total = coutMateriaux + this.parseNumber(coutMainOeuvre);
    const coutParM3 = volume > 0 ? total / volume : 0;

    return {
      longueur: this.formatResult(longueur, 2),
      largeur: this.formatResult(largeur, 2),
      profondeur: this.formatResult(profondeur, 2),
      volume: this.formatResult(volume, 3),
      poidsTonnes: this.formatResult(poidsTonnes, 2),
      coutMateriaux: this.formatResult(coutMateriaux, 2),
      coutMainOeuvre: this.formatResult(coutMainOeuvre, 2),
      coutParM3: this.formatResult(coutParM3, 2),
      total: this.formatResult(total, 2),
      unite: 'm³',
      description: `Terrassement ${longueur}m × ${largeur}m × ${profondeur}m`
    };
  }

  /**
   * Méthode attendue par useCalculator
   * @returns {Object} Résultats du calcul
   */
  getResults() {
    return this.calculate();
  }

  parseNumber(value) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  }

  calculateVolumeExcavation() {
    return this.calculateVolume();
  }

  estimerNombreCamions(capaciteCamion = 10) {
    const volume = this.calculateVolume();
    return Math.ceil(volume / capaciteCamion);
  }

  estimerDureeTravaux(rendementJournalier = 50) {
    const volume = this.calculateVolume();
    return Math.ceil(volume / rendementJournalier);
  }

  exportForDevis() {
    const results = this.calculate();
    
    return {
      section: 'Terrassement',
      lignes: [
        {
          designation: results.description,
          unite: results.unite,
          quantite: results.volume,
          prixUnitaire: this.inputs.prixUnitaire || 0,
          montant: results.coutMateriaux
        },
        {
          designation: 'Main d\'œuvre terrassement',
          unite: 'Forfait',
          quantite: 1,
          prixUnitaire: this.inputs.coutMainOeuvre || 0,
          montant: results.coutMainOeuvre
        }
      ],
      sousTotal: results.total,
      metadata: {
        volume: results.volume,
        poids: results.poidsTonnes,
        camions: this.estimerNombreCamions(),
        dureeEstimee: this.estimerDureeTravaux()
      }
    };
  }
}

// Export de constantes spécifiques au terrassement
export const TERRASSEMENT_CONSTANTS = {
  RENDEMENT_JOURNALIER_DEFAUT: 50, // m³/jour
  CAPACITE_CAMION_DEFAUT: 10, // m³
  COEFFICIENT_FOISONNEMENT: 1.25, // Volume après excavation
};

export default TerrassementCalculator;
