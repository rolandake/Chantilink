// ============================================
// 📁 domains/tp/calculators/BuseCalculator.js
// Calculateur de buses pour ouvrages hydrauliques
// ============================================

import { BaseCalculator } from '../../../core/calculators/BaseCalculator';
import { DENSITIES, DOSAGES } from '../../../config/constants/common';

/**
 * Calculateur pour buses circulaires en béton armé
 * Gère: volume béton, matériaux (ciment, sable, gravier, acier), coûts
 */
export class BuseCalculator extends BaseCalculator {
  constructor(inputs) {
    super(inputs, 'tp');
  }

  /**
   * Validation des inputs
   * @returns {boolean} true si valide
   */
  validate() {
    // Validation des dimensions obligatoires
    const dimensionsValid = this.validatePositiveNumbers([
      'diametre',
      'longueur'
    ]);

    if (!dimensionsValid) {
      return false;
    }

    // Validation de la quantité (optionnelle, défaut = 1)
    const { quantite } = this.inputs;
    if (quantite !== undefined && (quantite < 1 || !Number.isInteger(Number(quantite)))) {
      return false;
    }

    // Validation des coûts (optionnels, peuvent être 0)
    const { prixUnitaire, coutMainOeuvre } = this.inputs;
    
    if (prixUnitaire !== undefined && prixUnitaire < 0) {
      return false;
    }
    
    if (coutMainOeuvre !== undefined && coutMainOeuvre < 0) {
      return false;
    }

    return true;
  }

  /**
   * Calculs principaux
   * @returns {Object} Résultats avec volume, matériaux et coûts
   */
  calculate() {
    // Extraction des inputs avec valeurs par défaut
    const { 
      diametre,
      longueur,
      quantite = 1,
      prixUnitaire = 0,
      coutMainOeuvre = 0
    } = this.inputs;

    // 1. Calcul du volume de béton pour UNE buse circulaire
    // Formule: V = π × r² × L
    const rayonMetres = this.parseNumber(diametre) / 2;
    const longueurMetres = this.parseNumber(longueur);
    const volumeUnitaire = Math.PI * Math.pow(rayonMetres, 2) * longueurMetres;
    
    // Volume total pour toutes les buses
    const qte = Math.max(1, parseInt(quantite) || 1);
    const volumeTotal = volumeUnitaire * qte;

    // 2. Calcul des matériaux (selon dosage béton armé)
    const dosage = DOSAGES.BETON_ARME;
    
    // Ciment
    const cimentKg = volumeTotal * dosage.ciment;
    const cimentSacs = cimentKg / 50; // 1 sac = 50kg
    const cimentT = cimentKg / 1000;
    
    // Sable
    const sableM3 = volumeTotal * dosage.sable;
    const sableT = sableM3 * DENSITIES.SABLE;
    
    // Gravier
    const gravierM3 = volumeTotal * dosage.gravier;
    const gravierT = gravierM3 * DENSITIES.GRAVIER;
    
    // Acier d'armature
    const acierKg = volumeTotal * dosage.acier;
    const acierT = acierKg / 1000;

    // 3. Calculs de coûts
    const coutMateriaux = volumeTotal * this.parseNumber(prixUnitaire);
    const total = coutMateriaux + this.parseNumber(coutMainOeuvre);
    const coutParBuse = qte > 0 ? total / qte : 0;

    return {
      // Dimensions et quantité
      diametre: this.formatResult(diametre, 2),
      longueur: this.formatResult(longueur, 2),
      quantite: qte,
      
      // Volumes
      volumeUnitaire: this.formatResult(volumeUnitaire, 3),
      volume: this.formatResult(volumeTotal, 3),
      
      // Ciment
      cimentKg: this.formatResult(cimentKg, 0),
      cimentSacs: this.formatResult(cimentSacs, 1),
      cimentT: this.formatResult(cimentT, 3),
      
      // Sable
      sableM3: this.formatResult(sableM3, 3),
      sableT: this.formatResult(sableT, 3),
      
      // Gravier
      gravierM3: this.formatResult(gravierM3, 3),
      gravierT: this.formatResult(gravierT, 3),
      
      // Acier
      acierKg: this.formatResult(acierKg, 1),
      acierT: this.formatResult(acierT, 3),
      
      // Coûts
      coutMateriaux: this.formatResult(coutMateriaux, 2),
      coutMainOeuvre: this.formatResult(coutMainOeuvre, 2),
      coutParBuse: this.formatResult(coutParBuse, 2),
      total: this.formatResult(total, 2),
      
      // Métadonnées pour le devis
      unite: 'ml',
      description: `Buse Ø${diametre}m × ${longueur}m (×${qte})`
    };
  }

  /**
   * Helper: Parse number de manière sécurisée
   * @param {*} value - Valeur à parser
   * @returns {number} Nombre parsé ou 0
   */
  parseNumber(value) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : Math.max(0, parsed);
  }

  /**
   * Méthode spécifique: Calcul du poids total des buses
   * @returns {number} Poids en tonnes
   */
  calculerPoidsBuses() {
    const results = this.calculate();
    const densiteBeton = 2.5; // t/m³
    return results.volume * densiteBeton;
  }

  /**
   * Méthode spécifique: Estimation capacité hydraulique
   * @param {number} pente - Pente en % (défaut: 1%)
   * @param {number} coeffRugosite - Coefficient de Manning (défaut: 0.013)
   * @returns {Object} Débit et vitesse
   */
  estimerCapaciteHydraulique(pente = 1, coeffRugosite = 0.013) {
    const { diametre } = this.inputs;
    const rayon = this.parseNumber(diametre) / 2;
    const section = Math.PI * Math.pow(rayon, 2);
    const perimetreMouille = Math.PI * this.parseNumber(diametre);
    const rayonHydraulique = section / perimetreMouille;
    
    // Formule de Manning: V = (1/n) × R^(2/3) × I^(1/2)
    const vitesse = (1 / coeffRugosite) * Math.pow(rayonHydraulique, 2/3) * Math.pow(pente / 100, 0.5);
    const debit = section * vitesse * 3600; // m³/h
    
    return {
      section: this.formatResult(section, 3),
      vitesse: this.formatResult(vitesse, 2),
      debit: this.formatResult(debit, 1),
      debitLitres: this.formatResult(debit * 1000, 0)
    };
  }

  /**
   * Méthode spécifique: Calcul du remblai nécessaire
   * @param {number} hauteurRemblai - Hauteur au-dessus de la buse en m
   * @param {number} largeurTranchee - Largeur de la tranchée en m
   * @returns {number} Volume de remblai en m³
   */
  calculerRemblai(hauteurRemblai = 0.5, largeurTranchee = null) {
    const { diametre, longueur, quantite = 1 } = this.inputs;
    const largeur = largeurTranchee || (this.parseNumber(diametre) + 0.6); // +30cm de chaque côté
    const volumeRemblai = largeur * (this.parseNumber(diametre) + hauteurRemblai) * this.parseNumber(longueur) * quantite;
    
    return this.formatResult(volumeRemblai, 2);
  }

  /**
   * Export pour devis détaillé
   * @returns {Object} Données formatées pour le devis
   */
  exportForDevis() {
    const results = this.calculate();
    const capacite = this.estimerCapaciteHydraulique();
    
    return {
      section: 'Ouvrages Hydrauliques - Buses',
      lignes: [
        {
          designation: results.description,
          unite: results.unite,
          quantite: results.longueur * results.quantite,
          prixUnitaire: this.inputs.prixUnitaire || 0,
          montant: results.coutMateriaux
        },
        {
          designation: 'Main d\'œuvre pose buses',
          unite: 'Forfait',
          quantite: results.quantite,
          prixUnitaire: this.inputs.coutMainOeuvre || 0,
          montant: results.coutMainOeuvre
        }
      ],
      sousTotal: results.total,
      metadata: {
        volumeBeton: results.volume,
        materiaux: {
          ciment: `${results.cimentT} t (${results.cimentSacs} sacs)`,
          sable: `${results.sableT} t (${results.sableM3} m³)`,
          gravier: `${results.gravierT} t (${results.gravierM3} m³)`,
          acier: `${results.acierT} t (${results.acierKg} kg)`
        },
        capaciteHydraulique: {
          debit: `${capacite.debit} m³/h (${capacite.debitLitres} L/h)`,
          vitesse: `${capacite.vitesse} m/s`
        },
        poidsBuses: `${this.formatResult(this.calculerPoidsBuses(), 2)} t`
      }
    };
  }
}

// Export de constantes spécifiques aux buses
export const BUSE_CONSTANTS = {
  DIAMETRES_STANDARDS: [0.3, 0.4, 0.5, 0.6, 0.8, 1.0, 1.2, 1.5, 2.0], // en mètres
  LONGUEURS_STANDARDS: [1.0, 2.0, 2.5, 3.0], // en mètres
  PENTE_MIN: 0.5, // % minimum recommandé
  PENTE_MAX: 10, // % maximum recommandé
  COEFF_MANNING_BETON: 0.013, // Coefficient de rugosité pour béton lisse
  DENSITE_BETON: 2.5, // t/m³
  RECOUVREMENT_MIN: 0.3, // m minimum au-dessus de la buse
};

// Export par défaut
export default BuseCalculator;