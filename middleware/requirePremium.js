// middleware/requirePremium.js

export function requirePremium(req, res, next) {
  if (req.user && req.user.isPremium) {
    return next();
  }
  return res.status(403).json({ message: "Accès réservé aux utilisateurs premium." });
}
