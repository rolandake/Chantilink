// backend/utils/storyCleanup.js
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';

/**
 * Fonction pour nettoyer les stories expirées (plus de 24h)
 * À implémenter selon votre modèle Story
 */
async function cleanupExpiredStories(logger) {
  try {
    // TODO: Implémenter la logique de nettoyage
    // Exemple:
    // const Story = await import('../models/Story.js').then(m => m.default);
    // const expiredStories = await Story.find({
    //   createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    // });
    
    // for (const story of expiredStories) {
    //   // Supprimer les fichiers associés
    //   if (story.mediaPath) {
    //     fs.unlinkSync(path.join(process.cwd(), story.mediaPath));
    //   }
    //   await story.deleteOne();
    // }
    
    logger?.info('✅ Nettoyage des stories terminé');
  } catch (err) {
    logger?.error('❌ Erreur nettoyage stories:', err.message);
  }
}

/**
 * Planifie le nettoyage automatique des stories toutes les heures
 */
export function scheduleStoryCleanup(logger) {
  // Exécuter toutes les heures
  cron.schedule('0 * * * *', () => {
    logger?.info('🧹 Démarrage du nettoyage des stories...');
    cleanupExpiredStories(logger);
  });

  logger?.info('✅ Planificateur de nettoyage des stories activé (toutes les heures)');
}

export default scheduleStoryCleanup;