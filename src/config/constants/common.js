// 📁 config/constants/common.js
// ============================================
export const DENSITIES = {
  TERRE: 1.7,
  BETON: 2.4,
  SABLE: 1.6,
  GRAVIER: 1.75,
  TERRE_STABILISEE: 1.9,
  ENROBE: 2.4,
  ACIER: 7.85,
};

export const DOSAGES = {
  BETON_ARME: {
    ciment: 350, // kg/m³
    sable: 0.43,
    gravier: 0.85,
    eau: 175, // L/m³
    acier: 120, // kg/m³
  },
  BETON_STANDARD: {
    ciment: 300,
    sable: 0.45,
    gravier: 0.8,
    eau: 175,
    acier: 70,
  },
};

export const STORAGE_KEYS = {
  PREFIX: 'ibtp_',
  CALCULATIONS: 'calculations',
  USER_PREFS: 'user_preferences',
  HISTORY: 'history',
};
