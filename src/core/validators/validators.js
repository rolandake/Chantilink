
// ============================================
// 📁 core/validators/validators.js
// ============================================
export class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export const validators = {
  isPositiveNumber: (value, fieldName) => {
    const num = Number(value);
    if (isNaN(num) || num <= 0) {
      throw new ValidationError(`${fieldName} doit être un nombre positif`, fieldName);
    }
    return true;
  },

  isNonNegativeNumber: (value, fieldName) => {
    const num = Number(value);
    if (isNaN(num) || num < 0) {
      throw new ValidationError(`${fieldName} doit être >= 0`, fieldName);
    }
    return true;
  },

  validateDimensions: (dimensions) => {
    const required = ['longueur', 'largeur'];
    for (const field of required) {
      if (!dimensions[field] || dimensions[field] <= 0) {
        throw new ValidationError(`${field} requis et positif`, field);
      }
    }
    return true;
  },

  validateRange: (value, min, max, fieldName) => {
    const num = Number(value);
    if (isNaN(num) || num < min || num > max) {
      throw new ValidationError(
        `${fieldName} doit être entre ${min} et ${max}`,
        fieldName
      );
    }
    return true;
  },

  isEmail: (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(email)) {
      throw new ValidationError('Email invalide', 'email');
    }
    return true;
  },
};
