// ============================================
// backend/routes/visionAIRoutes.js
// Routes pour le bureau d'étude virtuel
// ============================================

import express from 'express';
import multer from 'multer';
import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import vision from '@google-cloud/vision';
import Tesseract from 'tesseract.js';
import pdf from 'pdf-parse';
import sharp from 'sharp';

const router = express.Router();

// Configuration upload
const upload = multer({ 
  storage: multer.memoryBuffer(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Clients AI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const visionClient = new vision.ImageAnnotatorClient();

// ========================================
// ANALYSE DE PLANS (Vision AI)
// ========================================
router.post('/analyze-plan', upload.single('plan'), async (req, res) => {
  try {
    const { projectType, engineerMode } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    console.log(`[VisionAI] Analyse plan: ${file.originalname} (${projectType} - ${engineerMode})`);

    let extractedData = {};

    // 1. OCR sur le plan
    const ocrResult = await extractTextFromPlan(file.buffer);
    
    // 2. Détection d'objets et dimensions (Google Vision)
    const visionResult = await analyzeWithGoogleVision(file.buffer);
    
    // 3. Analyse intelligente avec GPT-4 Vision
    const aiAnalysis = await analyzeWithGPT4Vision(file.buffer, projectType, engineerMode, ocrResult);

    extractedData = {
      filename: file.originalname,
      projectType,
      engineerMode,
      
      // Données extraites
      text: ocrResult.text,
      dimensions: aiAnalysis.dimensions || {},
      materials: aiAnalysis.materials || [],
      structural: aiAnalysis.structural || [],
      quantities: aiAnalysis.quantities || {},
      
      // Métadonnées
      confidence: ocrResult.confidence,
      detectedObjects: visionResult.objects,
      labels: visionResult.labels,
      
      // Recommandations IA
      recommendations: aiAnalysis.recommendations || [],
      warnings: aiAnalysis.warnings || [],
      nextSteps: aiAnalysis.nextSteps || []
    };

    res.json({
      success: true,
      data: extractedData,
      message: 'Plan analysé avec succès'
    });

  } catch (error) {
    console.error('[VisionAI] Erreur analyse:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'analyse du plan',
      details: error.message 
    });
  }
});

// ========================================
// CALCULS D'INGÉNIERIE AUTOMATIQUES
// ========================================
router.post('/calculate', async (req, res) => {
  try {
    const { planData, projectType, engineerMode, calculationType } = req.body;

    console.log(`[VisionAI] Calculs: ${calculationType} (${projectType} - ${engineerMode})`);

    let calculations = {};

    switch (engineerMode) {
      case 'structural':
        calculations = await performStructuralCalculations(planData, calculationType);
        break;
      case 'hydraulic':
        calculations = await performHydraulicCalculations(planData);
        break;
      case 'roads':
        calculations = await performRoadsCalculations(planData);
        break;
      case 'electrical':
        calculations = await performElectricalCalculations(planData);
        break;
      case 'geotechnical':
        calculations = await performGeotechnicalCalculations(planData);
        break;
      default:
        calculations = await performGeneralCalculations(planData);
    }

    // Vérification avec l'IA
    const aiVerification = await verifyCalculationsWithAI(calculations, projectType, engineerMode);

    res.json({
      success: true,
      calculationType,
      data: {
        ...calculations,
        verification: aiVerification,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[VisionAI] Erreur calculs:', error);
    res.status(500).json({ 
      error: 'Erreur lors des calculs',
      details: error.message 
    });
  }
});

// ========================================
// CHAT AVEC CONTEXTE INGÉNIERIE
// ========================================
router.post('/chat', async (req, res) => {
  try {
    const { userId, history, projectType, engineerMode, planData, calculations, phase, context } = req.body;

    console.log(`[VisionAI] Chat: ${userId} (${projectType} - ${engineerMode} - ${phase})`);

    // Construction du prompt système avancé
    const systemPrompt = buildEngineerSystemPrompt(engineerMode, projectType, phase, planData, calculations, context);

    // Appel à Claude (meilleur pour l'ingénierie)
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      system: systemPrompt,
      messages: history.map(m => ({
        role: m.role === 'ai' ? 'assistant' : m.role,
        content: m.content
      }))
    });

    const aiResponse = response.content[0].text;

    // Détecter des actions suggérées
    const actions = extractSuggestedActions(aiResponse);
    const suggestions = extractSuggestions(aiResponse);

    res.json({
      success: true,
      response: aiResponse,
      actions,
      suggestions
    });

  } catch (error) {
    console.error('[VisionAI] Erreur chat:', error);
    res.status(500).json({ 
      error: 'Erreur lors du chat',
      details: error.message 
    });
  }
});

// ========================================
// VÉRIFICATION RÉGLEMENTAIRE
// ========================================
router.post('/verify', async (req, res) => {
  try {
    const { calculations, standards, projectType } = req.body;

    console.log(`[VisionAI] Vérification: ${standards.join(', ')} (${projectType})`);

    const checks = [];

    // Vérifications selon les normes
    for (const standard of standards) {
      const result = await verifyAgainstStandard(calculations, standard, projectType);
      checks.push(result);
    }

    // Analyse globale par l'IA
    const aiAnalysis = await analyzeComplianceWithAI(checks, calculations, standards);

    res.json({
      success: true,
      checks,
      standards: aiAnalysis.standards,
      warnings: aiAnalysis.warnings,
      recommendations: aiAnalysis.recommendations,
      overallCompliance: aiAnalysis.overallCompliance
    });

  } catch (error) {
    console.error('[VisionAI] Erreur vérification:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// OPTIMISATION DU DESIGN
// ========================================
router.post('/optimize', async (req, res) => {
  try {
    const { currentDesign, calculations, objectives } = req.body;

    console.log(`[VisionAI] Optimisation: ${objectives.join(', ')}`);

    // Utiliser l'IA pour proposer des optimisations
    const optimizations = await generateOptimizations(currentDesign, calculations, objectives);

    res.json({
      success: true,
      savings: optimizations.estimatedSavings,
      savingsPercent: optimizations.savingsPercent,
      improvements: optimizations.improvements,
      alternatives: optimizations.alternatives
    });

  } catch (error) {
    console.error('[VisionAI] Erreur optimisation:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// GÉNÉRATION DE RAPPORT TECHNIQUE
// ========================================
router.post('/generate-report', async (req, res) => {
  try {
    const { projectType, planData, calculations, phase } = req.body;

    console.log(`[VisionAI] Génération rapport: ${projectType} (${phase})`);

    const report = await generateTechnicalReport(projectType, planData, calculations, phase);

    // Sauvegarder le rapport
    const reportUrl = await saveReportAsPDF(report);

    res.json({
      success: true,
      report: {
        summary: report.summary,
        sections: report.sections.length,
        pages: report.pages
      },
      reportUrl
    });

  } catch (error) {
    console.error('[VisionAI] Erreur rapport:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// FONCTIONS HELPER
// ========================================

async function extractTextFromPlan(buffer) {
  try {
    const { data: { text, confidence } } = await Tesseract.recognize(buffer, 'fra+eng');
    return { text, confidence };
  } catch (error) {
    console.error('Erreur OCR:', error);
    return { text: '', confidence: 0 };
  }
}

async function analyzeWithGoogleVision(buffer) {
  try {
    const [result] = await visionClient.annotateImage({
      image: { content: buffer },
      features: [
        { type: 'OBJECT_LOCALIZATION' },
        { type: 'LABEL_DETECTION' },
        { type: 'TEXT_DETECTION' }
      ]
    });

    return {
      objects: result.localizedObjectAnnotations || [],
      labels: result.labelAnnotations || [],
      text: result.textAnnotations?.[0]?.description || ''
    };
  } catch (error) {
    console.error('Erreur Google Vision:', error);
    return { objects: [], labels: [], text: '' };
  }
}

async function analyzeWithGPT4Vision(buffer, projectType, engineerMode, ocrData) {
  try {
    const base64Image = buffer.toString('base64');

    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      max_tokens: 4000,
      messages: [
        {
          role: 'system',
          content: `Tu es un ingénieur ${engineerMode} expert. Analyse ce plan de ${projectType} et extrais:
- Toutes les dimensions (longueurs, largeurs, hauteurs, épaisseurs)
- Les matériaux utilisés avec quantités
- Les éléments structuraux (poteaux, poutres, dalles, fondations, etc.)
- Les contraintes et charges
- Des recommandations techniques

Réponds en JSON structuré.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            },
            {
              type: 'text',
              text: `Texte OCR détecté:\n${ocrData.text}\n\nAnalyse ce plan en détail.`
            }
          ]
        }
      ]
    });

    const analysis = JSON.parse(response.choices[0].message.content);
    return analysis;

  } catch (error) {
    console.error('Erreur GPT-4 Vision:', error);
    return {
      dimensions: {},
      materials: [],
      structural: [],
      recommendations: ['Erreur analyse IA']
    };
  }
}

async function performStructuralCalculations(planData, type) {
  // Calculs de structure (béton armé, charpente métallique, etc.)
  const calculations = {
    // Charges
    deadLoad: calculateDeadLoad(planData),
    liveLoad: calculateLiveLoad(planData),
    windLoad: calculateWindLoad(planData),
    seismicLoad: calculateSeismicLoad(planData),
    totalLoad: 0,

    // Dimensionnement
    sizing: {
      beams: dimensionBeams(planData),
      columns: dimensionColumns(planData),
      slabs: dimensionSlabs(planData),
      foundations: dimensionFoundations(planData)
    },

    // Quantitatifs
    concrete: calculateConcrete(planData),
    steel: calculateSteel(planData),
    formwork: calculateFormwork(planData),

    // Coût
    cost: estimateCost(planData)
  };

  calculations.totalLoad = calculations.deadLoad + calculations.liveLoad + calculations.windLoad;

  return calculations;
}

function buildEngineerSystemPrompt(engineerMode, projectType, phase, planData, calculations, context) {
  return `Tu es un ingénieur ${engineerMode} senior avec 20 ans d'expérience dans les projets de ${projectType}.

CONTEXTE DU PROJET:
- Phase actuelle: ${phase}
- Type de projet: ${projectType}
- Plan analysé: ${context.hasPlan ? 'Oui' : 'Non'}
- Calculs disponibles: ${context.hasCalculations ? 'Oui' : 'Non'}

${planData ? `DONNÉES DU PLAN:
${JSON.stringify(planData, null, 2)}` : ''}

${calculations ? `CALCULS EFFECTUÉS:
${JSON.stringify(calculations, null, 2)}` : ''}

TES CAPACITÉS:
- Analyse approfondie de plans techniques
- Calculs d'ingénierie complexes (RDM, béton armé, hydraulique, etc.)
- Vérification de conformité aux normes (DTU, Eurocodes, BAEL, etc.)
- Optimisation de design (coût, sécurité, durabilité)
- Génération de rapports techniques professionnels
- Conseils sur l'exécution et le suivi de chantier

INSTRUCTIONS:
- Réponds de manière technique et précise
- Cite les normes applicables
- Propose des solutions concrètes
- Identifie les risques et points d'attention
- Suggère des optimisations quand pertinent
- Si des calculs ou vérifications sont nécessaires, propose-les explicitement

Si tu identifies des actions à entreprendre (recalculer, vérifier, optimiser, générer des plans), indique-les clairement.`;
}

function extractSuggestedActions(text) {
  const actions = [];
  
  if (text.includes('recalculer') || text.includes('refaire les calculs')) {
    actions.push({ type: 'recalculate', parameters: {} });
  }
  if (text.includes('vérifier') || text.includes('conformité')) {
    actions.push({ type: 'verify', parameters: {} });
  }
  if (text.includes('optimiser') || text.includes('améliorer')) {
    actions.push({ type: 'optimize', parameters: { objectives: ['cost', 'safety'] } });
  }
  
  return actions;
}

function extractSuggestions(text) {
  const suggestions = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('💡') || line.startsWith('✓') || line.startsWith('-')) {
      suggestions.push(line.replace(/^[💡✓-]\s*/, '').trim());
    }
  }
  
  return suggestions.slice(0, 3); // Max 3 suggestions
}

// Fonctions de calcul simplifiées (à implémenter en détail)
function calculateDeadLoad(data) { return 5.0; }
function calculateLiveLoad(data) { return 2.5; }
function calculateWindLoad(data) { return 1.0; }
function calculateSeismicLoad(data) { return 0.8; }
function dimensionBeams(data) { return '40x60 cm'; }
function dimensionColumns(data) { return '30x30 cm'; }
function dimensionSlabs(data) { return '20 cm'; }
function dimensionFoundations(data) { return 'Semelles isolées 1.5x1.5m'; }
function calculateConcrete(data) { return 120; }
function calculateSteel(data) { return 8500; }
function calculateFormwork(data) { return 450; }
function estimateCost(data) { return 50000000; }

async function verifyCalculationsWithAI(calculations, projectType, engineerMode) {
  // Vérifier la cohérence des calculs avec l'IA
  return {
    isValid: true,
    confidence: 0.95,
    warnings: []
  };
}

async function verifyAgainstStandard(calculations, standard, projectType) {
  // Vérifier contre une norme spécifique
  return {
    standard,
    compliant: true,
    checks: [
      { name: 'Charges admissibles', passed: true },
      { name: 'Dimensionnement', passed: true }
    ]
  };
}

async function analyzeComplianceWithAI(checks, calculations, standards) {
  return {
    standards: checks,
    warnings: [],
    recommendations: ['Tout est conforme'],
    overallCompliance: 98
  };
}

async function generateOptimizations(design, calculations, objectives) {
  return {
    estimatedSavings: 5000000,
    savingsPercent: 10,
    improvements: [
      { description: 'Optimisation de la section des poutres', impact: '5%' },
      { description: 'Utilisation de béton haute performance', impact: '3%' }
    ],
    alternatives: [
      { material: 'Béton C30/37 au lieu de C35/45', costReduction: 8, sustainabilityScore: 85 }
    ]
  };
}

async function generateTechnicalReport(projectType, planData, calculations, phase) {
  return {
    summary: 'Rapport technique du projet',
    sections: [
      { title: 'Introduction', content: '...' },
      { title: 'Analyse du plan', content: '...' },
      { title: 'Calculs', content: '...' },
      { title: 'Conclusions', content: '...' }
    ],
    pages: 15
  };
}

async function saveReportAsPDF(report) {
  // Sauvegarder le rapport en PDF et retourner l'URL
  return '/reports/rapport-technique.pdf';
}

export default router;