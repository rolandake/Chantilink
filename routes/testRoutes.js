// backend/routes/testRoutes.js
import express from 'express';
import { checkCloudinaryConfig, testCloudinaryConnection } from '../services/cloudinaryService.js';

const router = express.Router();

// Route de test de la configuration Cloudinary
router.get('/cloudinary-status', async (req, res) => {
  try {
    const config = checkCloudinaryConfig();
    const connectionTest = await testCloudinaryConnection();

    res.json({
      configuration: {
        isConfigured: config.isConfigured,
        cloudName: config.cloudName,
        hasApiKey: config.hasApiKey,
        hasApiSecret: config.hasApiSecret,
      },
      connection: connectionTest,
      recommendation: !config.isConfigured 
        ? "Cloudinary non configuré. Le système utilisera le stockage local. Pour utiliser Cloudinary, ajoutez CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET dans votre fichier .env"
        : connectionTest.success 
          ? "Cloudinary fonctionne correctement ✅" 
          : "Cloudinary configuré mais la connexion a échoué. Le système basculera vers le stockage local.",
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erreur lors du test de configuration',
      message: error.message,
    });
  }
});

export default router;