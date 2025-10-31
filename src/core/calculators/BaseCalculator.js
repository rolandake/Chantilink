// ============================================
// 📁 core/calculators/BaseCalculator.js
// CLASSE DE BASE UNIVERSELLE POUR TOUS LES DOMAINES
// ============================================

export class BaseCalculator {
  constructor(inputs = {}, domain = null) {
    this.inputs = inputs;
    this.domain = domain;
    this.results = {};
    this.errors = [];
  }

  // -------------------------
  // VALIDATION
  // -------------------------

  /**
   * Méthode à surcharger par chaque calculateur spécifique
   * Doit remplir this.errors si validation échoue
   */
  validate() {
    throw new Error('validate() must be implemented in subclass');
  }

  /**
   * Validation générique des nombres positifs
   * @param {string[]} fields - champs à vérifier
   * @returns {boolean} true si tous valides
   */
  validatePositiveNumbers(fields) {
    for (const field of fields) {
      const value = this.inputs[field];
      if (value === undefined || value === null || isNaN(value) || parseFloat(value) <= 0) {
        this.errors.push({ field, message: `${field} doit être un nombre positif` });
      }
    }
    return this.errors.length === 0;
  }

  /**
   * Validation générique des champs requis
   * @param {string[]} fields - champs obligatoires
   */
  validateRequiredFields(fields) {
    for (const field of fields) {
      const value = this.inputs[field];
      if (value === undefined || value === null || value === '') {
        this.errors.push({ field, message: `${field} est requis` });
      }
    }
    return this.errors.length === 0;
  }

  // -------------------------
  // CALCUL
  // -------------------------

  /**
   * Méthode à surcharger par chaque calculateur spécifique
   */
  calculate() {
    throw new Error('calculate() must be implemented in subclass');
  }

  /**
   * Méthode principale pour obtenir les résultats
   */
  getResults() {
    this.errors = [];
    const isValid = this.validate();
    if (!isValid) {
      throw new Error(`Validation failed: ${this.errors.map(e => e.message).join(', ')}`);
    }
    this.results = this.calculate();
    return this.results;
  }

  // -------------------------
  // UTILITAIRES
  // -------------------------

  /**
   * Formatage sécurisé d’un résultat
   * @param {number} value
   * @param {number} decimals
   */
  formatResult(value, decimals = 2) {
    if (value === undefined || value === null || isNaN(value)) return 0;
    return Number(parseFloat(value).toFixed(decimals));
  }

  /**
   * Calcul de volume standard (L x l x h)
   */
  calculateVolume() {
    const { longueur, largeur, hauteur } = this.inputs;
    return (parseFloat(longueur) || 0) * (parseFloat(largeur) || 0) * (parseFloat(hauteur) || 0);
  }

  /**
   * Calcul de surface (L x l)
   */
  calculateSurface() {
    const { longueur, largeur } = this.inputs;
    return (parseFloat(longueur) || 0) * (parseFloat(largeur) || 0);
  }

  /**
   * Arrondi et sécurisation d’un nombre
   */
  safeNumber(value, defaultValue = 0) {
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  }
}
