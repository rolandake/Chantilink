// backend/services/cloudinaryService.js
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// VÉRIFICATION DE LA CONFIGURATION
// ============================================
const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('✅ Cloudinary configuré');
  console.log(`   Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
} else {
  console.log('⚠️  Cloudinary NON configuré - Utilisation du stockage local');
  console.log('   Variables manquantes:');
  if (!process.env.CLOUDINARY_CLOUD_NAME) console.log('   - CLOUDINARY_CLOUD_NAME');
  if (!process.env.CLOUDINARY_API_KEY) console.log('   - CLOUDINARY_API_KEY');
  if (!process.env.CLOUDINARY_API_SECRET) console.log('   - CLOUDINARY_API_SECRET');
}

// ============================================
// FONCTION D'UPLOAD (CLOUDINARY OU LOCAL)
// ============================================
export async function uploadToCloudinary(filePath, folder = 'stories') {
  try {
    console.log(`📤 Upload fichier: ${path.basename(filePath)}`);
    
    // VÉRIFICATION 1: Fichier existe
    try {
      await fs.access(filePath);
    } catch (error) {
      throw new Error(`Fichier introuvable: ${filePath}`);
    }

    // VÉRIFICATION 2: Configuration Cloudinary
    if (!isCloudinaryConfigured) {
      console.log('📁 Mode stockage local activé');
      return await uploadToLocalStorage(filePath, folder);
    }

    // UPLOAD VERS CLOUDINARY
    console.log('☁️  Upload vers Cloudinary...');
    
    // Déterminer le type de ressource
    const ext = path.extname(filePath).toLowerCase();
    const resourceType = ['.mp4', '.webm', '.mov'].includes(ext) ? 'video' : 'image';
    
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: resourceType,
      transformation: resourceType === 'video' 
        ? [{ quality: 'auto', fetch_format: 'auto' }]
        : [{ quality: 'auto', width: 1080, crop: 'limit' }]
    });

    console.log('✅ Upload Cloudinary réussi');
    console.log(`   URL: ${result.secure_url}`);
    console.log(`   Public ID: ${result.public_id}`);

    return {
      secureUrl: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      resourceType: result.resource_type,
    };

  } catch (error) {
    console.error('❌ Erreur upload:', error.message);
    
    // Si Cloudinary échoue, basculer vers stockage local
    if (isCloudinaryConfigured && error.http_code) {
      console.log('⚠️  Cloudinary a échoué, basculement vers stockage local');
      return await uploadToLocalStorage(filePath, folder);
    }
    
    throw error;
  }
}

// ============================================
// FONCTION D'UPLOAD LOCAL (FALLBACK)
// ============================================
async function uploadToLocalStorage(filePath, folder = 'stories') {
  try {
    console.log('📁 Upload local en cours...');
    
    // Créer le dossier de destination s'il n'existe pas
    const uploadDir = path.join(__dirname, '..', 'uploads', folder);
    await fs.mkdir(uploadDir, { recursive: true });

    // Générer un nom de fichier unique
    const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(filePath)}`;
    const destPath = path.join(uploadDir, filename);

    // Copier le fichier
    await fs.copyFile(filePath, destPath);
    
    console.log('✅ Upload local réussi');
    console.log(`   Chemin: ${destPath}`);

    // Construire l'URL relative
    const relativeUrl = `/uploads/${folder}/${filename}`;
    
    return {
      secureUrl: relativeUrl,
      publicId: `${folder}/${filename}`,
      format: path.extname(filePath).replace('.', ''),
      resourceType: 'local',
      isLocal: true,
    };

  } catch (error) {
    console.error('❌ Erreur upload local:', error);
    throw new Error(`Échec de l'upload local: ${error.message}`);
  }
}

// ============================================
// FONCTION DE SUPPRESSION
// ============================================
export async function deleteFromCloudinary(publicId) {
  try {
    console.log(`🗑️  Suppression: ${publicId}`);

    // Si c'est un fichier local
    if (publicId.startsWith('uploads/') || !isCloudinaryConfigured) {
      return await deleteFromLocalStorage(publicId);
    }

    // Suppression depuis Cloudinary
    const result = await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
    });

    console.log('✅ Suppression Cloudinary réussie:', result.result);
    
    return {
      success: result.result === 'ok',
      result: result.result,
    };

  } catch (error) {
    console.error('❌ Erreur suppression Cloudinary:', error.message);
    
    // Tenter suppression locale en fallback
    if (publicId.includes('/')) {
      return await deleteFromLocalStorage(publicId);
    }
    
    throw error;
  }
}

// ============================================
// FONCTION DE SUPPRESSION LOCALE
// ============================================
async function deleteFromLocalStorage(publicId) {
  try {
    console.log('🗑️  Suppression locale...');
    
    // Construire le chemin complet
    let filePath;
    
    if (publicId.startsWith('uploads/')) {
      // Format: uploads/stories/filename.jpg
      filePath = path.join(__dirname, '..', publicId);
    } else if (publicId.startsWith('/uploads/')) {
      // Format: /uploads/stories/filename.jpg
      filePath = path.join(__dirname, '..', publicId.substring(1));
    } else {
      // Format: stories/filename.jpg
      filePath = path.join(__dirname, '..', 'uploads', publicId);
    }

    // Vérifier si le fichier existe
    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
      console.log('✅ Fichier local supprimé');
      return { success: true, result: 'deleted' };
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('⚠️  Fichier déjà supprimé ou introuvable');
        return { success: true, result: 'not_found' };
      }
      throw error;
    }

  } catch (error) {
    console.error('❌ Erreur suppression locale:', error);
    throw error;
  }
}

// ============================================
// FONCTION DE VÉRIFICATION DE LA CONFIGURATION
// ============================================
export function checkCloudinaryConfig() {
  return {
    isConfigured: isCloudinaryConfigured,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
    hasApiKey: !!process.env.CLOUDINARY_API_KEY,
    hasApiSecret: !!process.env.CLOUDINARY_API_SECRET,
  };
}

// ============================================
// FONCTION DE TEST
// ============================================
export async function testCloudinaryConnection() {
  if (!isCloudinaryConfigured) {
    return {
      success: false,
      mode: 'local',
      message: 'Cloudinary non configuré - Mode local actif',
    };
  }

  try {
    // Tester la connexion avec une requête simple
    await cloudinary.api.ping();
    
    return {
      success: true,
      mode: 'cloudinary',
      message: 'Cloudinary connecté avec succès',
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    };
  } catch (error) {
    return {
      success: false,
      mode: 'local',
      message: `Erreur Cloudinary: ${error.message}`,
      error: error.message,
    };
  }
}

export default {
  uploadToCloudinary,
  deleteFromCloudinary,
  checkCloudinaryConfig,
  testCloudinaryConnection,
};