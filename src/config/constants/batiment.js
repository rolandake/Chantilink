
// ============================================
// 📁 config/constants/batiment.js
// ============================================
export const BATIMENT_CONSTANTS = {
  ELEMENTS: {
    TERRASSEMENT: { label: 'Terrassement', icon: '⛏️', type: 'volume' },
    FONDATION: { label: 'Fondation', icon: '🏗️', type: 'volume' },
    POTEAUX: { label: 'Poteaux', icon: '🏛️', type: 'unitaire' },
    POUTRES: { label: 'Poutres', icon: '➡️', type: 'lineaire' },
    DALLES: { label: 'Dalles', icon: '⬜', type: 'surface' },
    MURS: { label: 'Murs', icon: '🧱', type: 'surface' },
    ESCALIERS: { label: 'Escaliers', icon: '🪜', type: 'special' },
    TOITURE: { label: 'Toiture', icon: '🏠', type: 'surface' },
  },
  DOSAGES_SPECIFIQUES: {
    SEMELLE: { ciment: 300, sable: 0.4, gravier: 0.8 },
    LONGRINES: { ciment: 350, sable: 0.43, gravier: 0.85, acier: 100 },
    DALLE_PLEINE: { ciment: 350, sable: 0.43, gravier: 0.85, acier: 80 },
  },
};