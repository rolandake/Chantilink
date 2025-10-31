// ============================================
// 🚀 SCRIPT DE MIGRATION AUTOMATIQUE
// Fichier : scripts/migrate.js
// Usage : node scripts/migrate.js
// ============================================

const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  rootDir: path.join(__dirname, '..', 'src'),
  domains: ['batiment', 'tp', 'eco', 'energie', 'ferroviaire'],
  
  // Mapping des fichiers vers les types de calculateurs
  calculatorMappings: {
    // Bâtiment
    'Terrassement.jsx': { calculator: 'TerrassementCalculator', type: 'volume', fields: ['longueur', 'largeur', 'profondeur'] },
    'Fondation.jsx': { calculator: 'FondationCalculator', type: 'volume', fields: ['longueur', 'largeur', 'hauteur'] },
    'Dalles.jsx': { calculator: 'DallesCalculator', type: 'surface', fields: ['longueur', 'largeur', 'epaisseur'] },
    'Poteaux.jsx': { calculator: 'PoteauxCalculator', type: 'unitaire', fields: ['hauteur', 'section', 'quantite'] },
    'Poutres.jsx': { calculator: 'PoutresCalculator', type: 'lineaire', fields: ['longueur', 'section', 'quantite'] },
    'Murs.jsx': { calculator: 'MursCalculator', type: 'surface', fields: ['longueur', 'hauteur', 'epaisseur'] },
    'Escaliers.jsx': { calculator: 'EscaliersCalculator', type: 'special', fields: ['hauteur', 'giron', 'nombreMarches'] },
    'Longrines.jsx': { calculator: 'LongrinesCalculator', type: 'lineaire', fields: ['longueur', 'section'] },
    'Linteaux.jsx': { calculator: 'LinteauxCalculator', type: 'lineaire', fields: ['longueur', 'hauteur', 'epaisseur'] },
    'Planchers.jsx': { calculator: 'PlanchersCalculator', type: 'surface', fields: ['surface', 'epaisseur'] },
    'Elevations.jsx': { calculator: 'ElevationsCalculator', type: 'surface', fields: ['hauteur', 'perimetre'] },
    'Toiture.jsx': { calculator: 'ToitureCalculator', type: 'surface', fields: ['surface', 'pente'] },
    
    // TP
    'AccotementsForm.jsx': { calculator: 'AccotementsCalculator', type: 'surface', fields: ['longueur', 'largeur', 'epaisseur'] },
    'DalotForm.jsx': { calculator: 'DalotCalculator', type: 'hydraulique', fields: ['longueur', 'largeur', 'hauteur', 'epaisseur'] },
    'CaniveauForm.jsx': { calculator: 'CaniveauCalculator', type: 'hydraulique', fields: ['longueur', 'largeurHaut', 'largeurBas', 'profondeur'] },
    'BuseForm.jsx': { calculator: 'BuseCalculator', type: 'hydraulique', fields: ['diametre', 'longueur', 'epaisseur'] },
    'CoucheFormeForm.jsx': { calculator: 'CoucheFormeCalculator', type: 'couche', fields: ['surface', 'epaisseur'] },
    'CoucheBaseForm.jsx': { calculator: 'CoucheBaseCalculator', type: 'couche', fields: ['surface', 'epaisseur'] },
    'CoucheFondationForm.jsx': { calculator: 'CoucheFondationCalculator', type: 'couche', fields: ['surface', 'epaisseur'] },
    'CoucheRoulForm.jsx': { calculator: 'CoucheRoulementCalculator', type: 'couche', fields: ['surface', 'epaisseur'] },
    
    // Éco
    'TransportCarbone.jsx': { calculator: 'TransportCarboneCalculator', type: 'emission', fields: ['distance', 'carburant', 'consommation'] },
    'EauEco.jsx': { calculator: 'EauCalculator', type: 'ressource', fields: ['volume', 'duree'] },
    'EnergieEco.jsx': { calculator: 'EnergieEcoCalculator', type: 'ressource', fields: ['puissance', 'duree'] },
    'DechetsEco.jsx': { calculator: 'DechetsCalculator', type: 'ressource', fields: ['quantite', 'type'] },
    'TerrassementEco.jsx': { calculator: 'TerrassementEcoCalculator', type: 'emission', fields: ['volume'] },
    'FondationEco.jsx': { calculator: 'FondationEcoCalculator', type: 'emission', fields: ['volume'] },
    'MateriauxEco.jsx': { calculator: 'MateriauxEcoCalculator', type: 'emission', fields: ['quantite', 'materiau'] },
    
    // Énergie
    'CentraleSolaire.jsx': { calculator: 'CentraleSolaireCalculator', type: 'solaire', fields: ['puissanceCrete', 'ensoleillement'] },
    'MiniHydro.jsx': { calculator: 'MiniHydroCalculator', type: 'hydro', fields: ['debit', 'hauteurChute'] },
    'Dimensionnement.jsx': { calculator: 'DimensionnementCalculator', type: 'solaire', fields: ['consommation', 'autonomie'] },
    'DimensionPanneaux.jsx': { calculator: 'DimensionPanneauxCalculator', type: 'solaire', fields: ['puissance', 'surface'] },
    'OptionBatteries.jsx': { calculator: 'BatteriesCalculator', type: 'stockage', fields: ['capacite', 'tension'] },
    'SectionConducteurs.jsx': { calculator: 'ConducteursCalculator', type: 'electrique', fields: ['courant', 'longueur', 'chuteMax'] },
    
    // Ferroviaire
    'VoiesFerrees.jsx': { calculator: 'VoiesCalculator', type: 'infrastructure', fields: ['longueur', 'ecartement'] },
    'PlateformeFerroviaire.jsx': { calculator: 'PlateformeCalculator', type: 'infrastructure', fields: ['longueur', 'largeur', 'epaisseur'] },
    'Electrification.jsx': { calculator: 'ElectrificationCalculator', type: 'electrique', fields: ['longueur', 'tension'] },
    'PontsOuvrages.jsx': { calculator: 'PontsCalculator', type: 'ouvrage', fields: ['portee', 'largeur'] },
    'Gares.jsx': { calculator: 'GaresCalculator', type: 'infrastructure', fields: ['surface', 'capacite'] },
  }
};

// ============================================
// GÉNÉRATEUR DE CALCULATORS
// ============================================
class CalculatorGenerator {
  constructor(config) {
    this.config = config;
  }

  // Génère le code d'un Calculator
  generateCalculatorCode(name, type, fields) {
    const templates = {
      volume: this.generateVolumeCalculator,
      surface: this.generateSurfaceCalculator,
      lineaire: this.generateLineaireCalculator,
      unitaire: this.generateUnitaireCalculator,
      hydraulique: this.generateHydrauliqueCalculator,
      couche: this.generateCoucheCalculator,
      emission: this.generateEmissionCalculator,
      ressource: this.generateRessourceCalculator,
      solaire: this.generateSolaireCalculator,
      hydro: this.generateHydroCalculator,
      electrique: this.generateElectriqueCalculator,
      infrastructure: this.generateInfrastructureCalculator,
      special: this.generateSpecialCalculator,
    };

    const generator = templates[type] || this.generateGenericCalculator;
    return generator.call(this, name, fields);
  }

  // Template pour calculateur de volume
  generateVolumeCalculator(name, fields) {
    return `import { BaseCalculator } from '../../../core/calculators/BaseCalculator';
import { DENSITIES, DOSAGES } from '../../../config/constants/common';

export class ${name} extends BaseCalculator {
  validate() {
    return this.validatePositiveNumbers([${fields.map(f => `'${f}'`).join(', ')}]);
  }

  calculate() {
    const { ${fields.join(', ')}, prixUnitaire = 0, coutMainOeuvre = 0 } = this.inputs;
    
    // Calcul du volume
    const volume = ${fields.slice(0, 3).map(f => `parseFloat(${f})`).join(' * ')} || 0;
    
    // Calcul des matériaux (béton armé)
    const dosage = DOSAGES.BETON_ARME;
    const cimentKg = volume * dosage.ciment;
    const cimentT = cimentKg / 1000;
    const cimentSacs = cimentKg / 50;
    
    const sableM3 = volume * dosage.sable;
    const sableT = sableM3 * DENSITIES.SABLE;
    
    const gravierM3 = volume * dosage.gravier;
    const gravierT = gravierM3 * DENSITIES.GRAVIER;
    
    const eauL = volume * dosage.eau;
    const acierKg = volume * dosage.acier;
    const acierT = acierKg / 1000;
    
    // Coût total
    const coutMateriaux = volume * parseFloat(prixUnitaire);
    const total = coutMateriaux + parseFloat(coutMainOeuvre);

    return {
      volume: this.formatResult(volume, 3),
      cimentKg: this.formatResult(cimentKg, 0),
      cimentT: this.formatResult(cimentT, 3),
      cimentSacs: this.formatResult(cimentSacs, 1),
      sableM3: this.formatResult(sableM3, 3),
      sableT: this.formatResult(sableT, 3),
      gravierM3: this.formatResult(gravierM3, 3),
      gravierT: this.formatResult(gravierT, 3),
      eauL: this.formatResult(eauL, 0),
      acierKg: this.formatResult(acierKg, 0),
      acierT: this.formatResult(acierT, 3),
      coutMateriaux: this.formatResult(coutMateriaux, 2),
      total: this.formatResult(total, 2),
    };
  }
}
`;
  }

  // Template pour calculateur de surface
  generateSurfaceCalculator(name, fields) {
    return `import { BaseCalculator } from '../../../core/calculators/BaseCalculator';

export class ${name} extends BaseCalculator {
  validate() {
    return this.validatePositiveNumbers([${fields.map(f => `'${f}'`).join(', ')}]);
  }

  calculate() {
    const { ${fields.join(', ')}, prixUnitaire = 0, coutMainOeuvre = 0 } = this.inputs;
    
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
`;
  }

  // Template pour calculateur hydraulique (Dalot, Caniveau, Buse)
  generateHydrauliqueCalculator(name, fields) {
    return `import { BaseCalculator } from '../../../core/calculators/BaseCalculator';
import { DENSITIES, DOSAGES } from '../../../config/constants/common';

export class ${name} extends BaseCalculator {
  validate() {
    return this.validatePositiveNumbers([${fields.map(f => `'${f}'`).join(', ')}]);
  }

  calculate() {
    const { ${fields.join(', ')}, prixUnitaire = 0, coutMainOeuvre = 0 } = this.inputs;
    
    // Calcul du volume béton (formule spécifique selon le type)
    let volume = 0;
    ${name.includes('Dalot') ? `
    // Volume dalot = Volume extérieur - Volume intérieur
    const volumeExt = parseFloat(longueur) * (parseFloat(largeur) + 2 * parseFloat(epaisseur)) * (parseFloat(hauteur) + parseFloat(epaisseur));
    const volumeInt = parseFloat(longueur) * parseFloat(largeur) * parseFloat(hauteur);
    volume = volumeExt - volumeInt;
    ` : name.includes('Buse') ? `
    // Volume buse circulaire
    const rayonExt = (parseFloat(diametre) + 2 * parseFloat(epaisseur)) / 2;
    const rayonInt = parseFloat(diametre) / 2;
    volume = Math.PI * parseFloat(longueur) * (rayonExt * rayonExt - rayonInt * rayonInt);
    ` : `
    // Volume caniveau trapézoïdal
    const largeurMoy = (parseFloat(largeurHaut) + parseFloat(largeurBas)) / 2;
    volume = parseFloat(longueur) * largeurMoy * parseFloat(profondeur);
    `}
    
    // Matériaux
    const dosage = DOSAGES.BETON_ARME;
    const cimentKg = volume * dosage.ciment;
    const sableM3 = volume * dosage.sable;
    const gravierM3 = volume * dosage.gravier;
    const acierKg = volume * dosage.acier;
    
    // Coût
    const total = volume * parseFloat(prixUnitaire) + parseFloat(coutMainOeuvre);

    return {
      volume: this.formatResult(volume, 3),
      cimentKg: this.formatResult(cimentKg, 0),
      cimentT: this.formatResult(cimentKg / 1000, 3),
      sableM3: this.formatResult(sableM3, 3),
      sableT: this.formatResult(sableM3 * DENSITIES.SABLE, 3),
      gravierM3: this.formatResult(gravierM3, 3),
      gravierT: this.formatResult(gravierM3 * DENSITIES.GRAVIER, 3),
      acierKg: this.formatResult(acierKg, 0),
      acierT: this.formatResult(acierKg / 1000, 3),
      total: this.formatResult(total, 2),
    };
  }
}
`;
  }

  // Template pour émissions carbone
  generateEmissionCalculator(name, fields) {
    return `import { BaseCalculator } from '../../../core/calculators/BaseCalculator';
import { ECO_CONSTANTS } from '../../../config/constants/eco';

export class ${name} extends BaseCalculator {
  validate() {
    return this.validatePositiveNumbers([${fields.map(f => `'${f}'`).join(', ')}]);
  }

  calculate() {
    const { ${fields.join(', ')} } = this.inputs;
    
    // Calcul des émissions
    ${name.includes('Transport') ? `
    const facteur = ECO_CONSTANTS.FACTEURS_EMISSION[carburant?.toUpperCase()] || 2.5;
    const emission = parseFloat(distance) * parseFloat(consommation) * facteur / 100;
    ` : name.includes('Materiau') ? `
    const facteur = ECO_CONSTANTS.FACTEURS_EMISSION[materiau?.toUpperCase()] || 0.1;
    const emission = parseFloat(quantite) * facteur;
    ` : `
    // Émission par défaut basée sur le volume
    const emission = parseFloat(volume) * 0.15; // Exemple
    `}
    
    const equivalentArbres = emission / 22; // 1 arbre absorbe ~22kg CO2/an

    return {
      emission: this.formatResult(emission, 2),
      equivalentArbres: this.formatResult(equivalentArbres, 1),
      unite: 'kg CO2',
    };
  }
}
`;
  }

  // Template pour solaire
  generateSolaireCalculator(name, fields) {
    return `import { BaseCalculator } from '../../../core/calculators/BaseCalculator';
import { ENERGIE_CONSTANTS } from '../../../config/constants/energie';

export class ${name} extends BaseCalculator {
  validate() {
    return this.validatePositiveNumbers([${fields.map(f => `'${f}'`).join(', ')}]);
  }

  calculate() {
    const { ${fields.join(', ')} } = this.inputs;
    const { RENDEMENT_PANNEAU, HEURES_ENSOLEILLEMENT, FACTEUR_CORRECTION } = ENERGIE_CONSTANTS.SOLAIRE;
    
    // Production journalière
    const productionJournaliere = parseFloat(puissanceCrete || 0) * 
                                  parseFloat(ensoleillement || HEURES_ENSOLEILLEMENT) * 
                                  FACTEUR_CORRECTION;
    
    const productionAnnuelle = productionJournaliere * 365;
    const nbPanneaux = Math.ceil(parseFloat(puissanceCrete || 0) / 0.3); // Panneaux de 300W
    const surfaceNecessaire = nbPanneaux * 2; // 2m² par panneau

    return {
      productionJournaliere: this.formatResult(productionJournaliere, 2),
      productionAnnuelle: this.formatResult(productionAnnuelle, 0),
      nbPanneaux: nbPanneaux,
      surfaceNecessaire: this.formatResult(surfaceNecessaire, 1),
    };
  }
}
`;
  }

  // Template générique
  generateGenericCalculator(name, fields) {
    return `import { BaseCalculator } from '../../../core/calculators/BaseCalculator';

export class ${name} extends BaseCalculator {
  validate() {
    return this.validatePositiveNumbers([${fields.map(f => `'${f}'`).join(', ')}]);
  }

  calculate() {
    const { ${fields.join(', ')}, prixUnitaire = 0 } = this.inputs;
    
    // TODO: Implémenter la logique de calcul spécifique
    const resultat = 0;
    const total = resultat * parseFloat(prixUnitaire);

    return {
      resultat: this.formatResult(resultat, 2),
      total: this.formatResult(total, 2),
    };
  }
}
`;
  }

  generateLineaireCalculator(name, fields) {
    return this.generateGenericCalculator(name, fields);
  }

  generateUnitaireCalculator(name, fields) {
    return this.generateGenericCalculator(name, fields);
  }

  generateCoucheCalculator(name, fields) {
    return this.generateSurfaceCalculator(name, fields);
  }

  generateRessourceCalculator(name, fields) {
    return this.generateGenericCalculator(name, fields);
  }

  generateHydroCalculator(name, fields) {
    return this.generateGenericCalculator(name, fields);
  }

  generateElectriqueCalculator(name, fields) {
    return this.generateGenericCalculator(name, fields);
  }

  generateInfrastructureCalculator(name, fields) {
    return this.generateGenericCalculator(name, fields);
  }

  generateSpecialCalculator(name, fields) {
    return this.generateGenericCalculator(name, fields);
  }
}

// ============================================
// SCRIPT PRINCIPAL DE MIGRATION
// ============================================
class MigrationScript {
  constructor(config) {
    this.config = config;
    this.generator = new CalculatorGenerator(config);
    this.stats = {
      created: 0,
      skipped: 0,
      errors: 0,
    };
  }

  // Crée la structure de dossiers
  createDirectoryStructure() {
    console.log('📁 Création de la structure de dossiers...\n');
    
    const dirs = [
      'config/constants',
      'core/calculators',
      'core/storage',
      'core/validators',
      'core/utils',
      'shared/components',
      'shared/hooks',
      'shared/context',
    ];

    // Dossiers par domaine
    this.config.domains.forEach(domain => {
      dirs.push(
        `domains/${domain}/calculators`,
        `domains/${domain}/hooks`,
      );
    });

    dirs.forEach(dir => {
      const fullPath = path.join(this.config.rootDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`✅ Créé: ${dir}`);
      } else {
        console.log(`⏭️  Existe: ${dir}`);
      }
    });

    console.log('\n');
  }

  // Génère tous les calculators
  generateAllCalculators() {
    console.log('🔧 Génération des calculators...\n');

    Object.entries(this.config.calculatorMappings).forEach(([filename, config]) => {
      const { calculator, type, fields } = config;
      
      // Déterminer le domaine du fichier
      let domain = 'tp'; // Par défaut
      for (const d of this.config.domains) {
        const formPath = path.join(this.config.rootDir, 'pages', 'Calculs', d, 'forms', filename);
        if (fs.existsSync(formPath)) {
          domain = d;
          break;
        }
      }

      const calculatorPath = path.join(
        this.config.rootDir,
        'domains',
        domain,
        'calculators',
        `${calculator}.js`
      );

      // Générer le code
      const code = this.generator.generateCalculatorCode(calculator, type, fields);

      try {
        // Créer le fichier seulement s'il n'existe pas
        if (fs.existsSync(calculatorPath)) {
          console.log(`⏭️  Existe déjà: ${domain}/${calculator}`);
          this.stats.skipped++;
        } else {
          fs.writeFileSync(calculatorPath, code, 'utf8');
          console.log(`✅ Créé: ${domain}/${calculator}`);
          this.stats.created++;
        }
      } catch (error) {
        console.error(`❌ Erreur: ${domain}/${calculator} - ${error.message}`);
        this.stats.errors++;
      }
    });

    console.log('\n');
  }

  // Génère les fichiers index.js pour chaque domaine
  generateIndexFiles() {
    console.log('📝 Génération des fichiers index...\n');

    this.config.domains.forEach(domain => {
      const calculatorsDir = path.join(this.config.rootDir, 'domains', domain, 'calculators');
      const indexPath = path.join(calculatorsDir, 'index.js');

      if (!fs.existsSync(calculatorsDir)) return;

      // Lister tous les calculators du domaine
      const files = fs.readdirSync(calculatorsDir)
        .filter(f => f.endsWith('.js') && f !== 'index.js');

      const exports = files.map(f => {
        const name = f.replace('.js', '');
        return `export { ${name} } from './${name}';`;
      }).join('\n');

      fs.writeFileSync(indexPath, exports, 'utf8');
      console.log(`✅ Index créé: domains/${domain}/calculators/index.js`);
    });

    console.log('\n');
  }

  // Affiche le rapport final
  printReport() {
    console.log('═══════════════════════════════════════');
    console.log('📊 RAPPORT DE MIGRATION');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Calculators créés:  ${this.stats.created}`);
    console.log(`⏭️  Déjà existants:    ${this.stats.skipped}`);
    console.log(`❌ Erreurs:            ${this.stats.errors}`);
    console.log('═══════════════════════════════════════\n');
    
    console.log('🎯 PROCHAINES ÉTAPES:');
    console.log('1. Vérifier les calculators générés');
    console.log('2. Ajuster les calculs spécifiques si nécessaire');
    console.log('3. Créer les fichiers de constantes (config/constants/)');
    console.log('4. Mettre à jour vos composants pour utiliser useCalculator');
    console.log('\n✨ Migration terminée avec succès!\n');
  }

  // Exécute la migration complète
  run() {
    console.log('🚀 DÉBUT DE LA MIGRATION\n');
    this.createDirectoryStructure();
    this.generateAllCalculators();
    this.generateIndexFiles();
    this.printReport();
  }
}

// ============================================
// EXÉCUTION
// ============================================
if (require.main === module) {
  const migration = new MigrationScript(CONFIG);
  migration.run();
}

module.exports = { MigrationScript, CalculatorGenerator };
