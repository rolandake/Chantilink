
// ============================================
// 📁 core/utils/formatters.js
// ============================================
export const formatters = {
  number: (value, decimals = 2) => {
    return Number(parseFloat(value).toFixed(decimals));
  },

  currency: (value, currency = 'FCFA', locale = 'fr-FR') => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency === 'FCFA' ? 'XOF' : currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  },

  percentage: (value, decimals = 1) => {
    return `${(value * 100).toFixed(decimals)}%`;
  },

  date: (date, format = 'short') => {
    const d = new Date(date);
    const options = {
      short: { day: '2-digit', month: '2-digit', year: 'numeric' },
      long: { day: 'numeric', month: 'long', year: 'numeric' },
      datetime: { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      },
    };
    return new Intl.DateTimeFormat('fr-FR', options[format]).format(d);
  },

  volume: (value, unit = 'm³') => {
    return `${formatters.number(value, 3)} ${unit}`;
  },

  weight: (value, unit = 't') => {
    return `${formatters.number(value, 2)} ${unit}`;
  },

  distance: (value, unit = 'm') => {
    if (value >= 1000) {
      return `${formatters.number(value / 1000, 2)} km`;
    }
    return `${formatters.number(value, 1)} ${unit}`;
  },
};
