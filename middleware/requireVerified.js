// ============================================
// backend/middleware/requireVerified.js
// Middleware pour vérifier que l'utilisateur est vérifié
// ============================================

/**
 * Middleware pour s'assurer que l'utilisateur est vérifié
 * Utilise après authenticate.js
 */
export const requireVerified = (req, res, next) => {
  try {
    // Vérifier si l'utilisateur existe (authentifié)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise"
      });
    }

    // Vérifier si l'utilisateur est vérifié
    if (!req.user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Compte non vérifié. Veuillez vérifier votre email.",
        error: "ACCOUNT_NOT_VERIFIED"
      });
    }

    // Utilisateur vérifié, continuer
    next();
  } catch (error) {
    console.error("❌ [requireVerified] Erreur:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur de vérification",
      error: error.message
    });
  }
};

/**
 * Middleware optionnel pour marquer les fonctionnalités premium
 * qui nécessitent la vérification
 */
export const requireVerifiedOrPremium = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentification requise"
      });
    }

    // Autoriser si vérifié OU premium
    if (req.user.isVerified || req.user.isPremium) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Cette fonctionnalité nécessite un compte vérifié ou premium",
      error: "VERIFICATION_OR_PREMIUM_REQUIRED"
    });
  } catch (error) {
    console.error("❌ [requireVerifiedOrPremium] Erreur:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur de vérification",
      error: error.message
    });
  }
};

export default requireVerified;