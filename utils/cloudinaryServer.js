// backend/utils/cloudinaryServer.js - VERSION COMPLÈTE CORRIGÉE
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import dotenv from 'dotenv';

// ⚠️ Charger .env si pas déjà fait
if (!process.env.CLOUDINARY_API_KEY) {
  dotenv.config();
}

// ============================================
// Configuration Cloudinary
// ============================================
const config = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dlymdclhe',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
};

// Vérifier que toutes les clés sont présentes
if (!config.cloud_name || !config.api_key || !config.api_secret) {
  console.error('❌ Configuration Cloudinary incomplète!');
  console.error('Vérifiez votre fichier .env:');
  console.error('  - CLOUDINARY_CLOUD_NAME:', config.cloud_name ? '✓' : '✗');
  console.error('  - CLOUDINARY_API_KEY:', config.api_key ? '✓' : '✗');
  console.error('  - CLOUDINARY_API_SECRET:', config.api_secret ? '✓' : '✗');
  throw new Error('Configuration Cloudinary manquante');
}

cloudinary.config(config);

// Vérifier la configuration au démarrage
console.log('☁️ Cloudinary configuré:', {
  cloud_name: cloudinary.config().cloud_name,
  api_key_present: !!cloudinary.config().api_key,
  api_secret_present: !!cloudinary.config().api_secret
});

// ============================================
// Convertir Buffer en Stream
// ============================================
const bufferToStream = (buffer) => {
  const readable = new Readable();
  readable._read = () => {};
  readable.push(buffer);
  readable.push(null);
  return readable;
};

// ============================================
// Upload un fichier vers Cloudinary
// ============================================
/**
 * @param {Buffer} fileBuffer - Buffer du fichier
 * @param {string} folder - Dossier Cloudinary (users, posts, covers)
 * @param {string} filename - Nom original du fichier
 * @param {string} resourceType - 'image', 'video' ou 'auto'
 * @returns {Promise<Object>} Résultat Cloudinary
 */
export const uploadFile = async (fileBuffer, folder, filename, resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    // Nettoyer le nom de fichier
    const cleanFilename = filename
      .replace(/\s+/g, '-')
      .toLowerCase()
      .replace(/[^a-z0-9\-_.]/g, '');
    
    // Générer un nom unique sans extension
    const uniqueName = `${Date.now()}-${cleanFilename}`.replace(/\.[^/.]+$/, '');
    
    const uploadOptions = {
      folder: folder, // Ex: "posts", "users", "covers"
      public_id: uniqueName,
      resource_type: resourceType,
      overwrite: false,
      use_filename: false,
      unique_filename: true,
      // Transformations selon le type
      ...(resourceType === 'image' && {
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ]
      }),
      ...(resourceType === 'video' && {
        chunk_size: 6000000, // 6MB chunks
        eager: [
          { streaming_profile: "hd", format: "m3u8" }
        ]
      })
    };

    console.log('📤 Upload vers Cloudinary:', {
      folder,
      uniqueName,
      resourceType,
      size: `${(fileBuffer.length / 1024).toFixed(2)} KB`
    });

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('❌ Erreur upload Cloudinary:', error);
          reject(error);
        } else {
          console.log('✅ Upload Cloudinary réussi:', {
            public_id: result.public_id,
            url: result.secure_url,
            format: result.format,
            resource_type: result.resource_type,
            bytes: result.bytes
          });
          resolve(result);
        }
      }
    );

    // Envoyer le buffer vers Cloudinary
    bufferToStream(fileBuffer).pipe(uploadStream);
  });
};

// ============================================
// Supprimer un fichier de Cloudinary
// ============================================
/**
 * @param {string} publicId - publicId du fichier (ex: "posts/123-image")
 * @param {string} resourceType - 'image' ou 'video'
 * @returns {Promise<Object>}
 */
export const deleteFile = async (publicId, resourceType = 'image') => {
  try {
    console.log('🗑️ Suppression Cloudinary:', publicId);
    
    // Essayer d'abord comme image
    let result = await cloudinary.uploader.destroy(publicId, { 
      resource_type: 'image' 
    });
    
    // Si échec, essayer comme vidéo
    if (result.result !== 'ok') {
      result = await cloudinary.uploader.destroy(publicId, { 
        resource_type: 'video' 
      });
    }
    
    console.log('✅ Suppression réussie:', result);
    return result;
  } catch (error) {
    console.error('❌ Erreur suppression Cloudinary:', error);
    throw error;
  }
};

// ============================================
// Générer une URL Cloudinary optimisée
// ============================================
/**
 * @param {string} publicId - publicId du fichier
 * @param {Object} options - Options de transformation
 * @returns {string} URL Cloudinary
 */
export const getCloudinaryUrl = (publicId, options = {}) => {
  if (!publicId) return null;
  
  const {
    width,
    height,
    crop = 'limit',
    quality = 'auto',
    format = 'auto',
    gravity
  } = options;

  const transformations = [];
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (crop) transformations.push(`c_${crop}`);
  if (quality) transformations.push(`q_${quality}`);
  if (format) transformations.push(`f_${format}`);
  if (gravity) transformations.push(`g_${gravity}`);

  const isVideo = publicId.includes('posts') && 
    (publicId.includes('mp4') || publicId.includes('webm'));
  
  const baseUrl = isVideo 
    ? `https://res.cloudinary.com/${cloudinary.config().cloud_name}/video/upload/`
    : `https://res.cloudinary.com/${cloudinary.config().cloud_name}/image/upload/`;

  const transformStr = transformations.length > 0 
    ? transformations.join(',') + '/' 
    : '';
  
  return `${baseUrl}${transformStr}${publicId}`;
};

// ============================================
// Vérifier si un fichier existe
// ============================================
/**
 * @param {string} publicId
 * @returns {Promise<boolean>}
 */
export const fileExists = async (publicId) => {
  try {
    await cloudinary.api.resource(publicId);
    return true;
  } catch (error) {
    if (error.http_code === 404) return false;
    throw error;
  }
};

// ============================================
// Récupérer les détails d'un fichier
// ============================================
/**
 * @param {string} publicId
 * @returns {Promise<Object>}
 */
export const getFileDetails = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return {
      public_id: result.public_id,
      format: result.format,
      resource_type: result.resource_type,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      url: result.secure_url,
      created_at: result.created_at
    };
  } catch (error) {
    console.error('❌ Erreur récupération détails:', error);
    throw error;
  }
};

// ============================================
// Upload multiple files
// ============================================
/**
 * @param {Array<Buffer>} files - Array de buffers
 * @param {string} folder - Dossier Cloudinary
 * @param {Array<string>} filenames - Array des noms de fichiers
 * @returns {Promise<Array<Object>>}
 */
export const uploadMultipleFiles = async (files, folder, filenames) => {
  try {
    const uploadPromises = files.map((fileBuffer, index) => {
      const filename = filenames[index] || `file-${index}`;
      const isVideo = filename.match(/\.(mp4|webm|mov)$/i);
      return uploadFile(
        fileBuffer, 
        folder, 
        filename, 
        isVideo ? 'video' : 'image'
      );
    });

    const results = await Promise.all(uploadPromises);
    console.log(`✅ ${results.length} fichiers uploadés avec succès`);
    return results;
  } catch (error) {
    console.error('❌ Erreur upload multiple:', error);
    throw error;
  }
};

// ============================================
// Supprimer plusieurs fichiers
// ============================================
/**
 * @param {Array<string>} publicIds - Array de publicIds
 * @returns {Promise<Array<Object>>}
 */
export const deleteMultipleFiles = async (publicIds) => {
  try {
    const deletePromises = publicIds.map(publicId => deleteFile(publicId));
    const results = await Promise.all(deletePromises);
    console.log(`✅ ${results.length} fichiers supprimés`);
    return results;
  } catch (error) {
    console.error('❌ Erreur suppression multiple:', error);
    throw error;
  }
};

// Export par défaut
export default {
  uploadFile,
  deleteFile,
  getCloudinaryUrl,
  fileExists,
  getFileDetails,
  uploadMultipleFiles,
  deleteMultipleFiles
};