// backend/utils/cloudinaryServer.js
import { v2 as cloudinary } from "cloudinary";
import { CLOUDINARY_CONFIG } from "../config.js";

// === CONFIGURATION CLOUDINARY ===
cloudinary.config({
  cloud_name: CLOUDINARY_CONFIG.cloudName,
  api_key: CLOUDINARY_CONFIG.apiKey,
  api_secret: CLOUDINARY_CONFIG.apiSecret,
  secure: true,
});

// === UPLOAD DE FICHIERS ===
/**
 * Upload d'un fichier en mémoire sur Cloudinary
 * @param {Buffer} buffer - Le buffer du fichier
 * @param {string} folder - Le dossier Cloudinary
 * @param {string} filename - Nom original du fichier
 * @returns {Promise<object>} - Retourne l'objet complet avec secure_url, public_id, etc.
 */
export function uploadFile(buffer, folder = "default", filename = "file") {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        folder, 
        public_id: filename.split('.')[0], // Retire l'extension
        resource_type: "auto" 
      },
      (error, result) => {
        if (error) return reject(error);
        // ✅ CORRECTION: On retourne l'objet complet, pas juste l'URL
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          resource_type: result.resource_type,
          format: result.format,
          width: result.width,
          height: result.height,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Supprime un fichier de Cloudinary
 * @param {string} publicId - L'ID public Cloudinary
 * @param {string} resourceType - Type de ressource (image, video, raw)
 */
export function deleteFile(publicId, resourceType = "image") {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { resource_type: resourceType }, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
}

// === UTILS URLS ===
const CLOUDINARY_BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CONFIG.cloudName}`;

export function getCloudinaryUrl(path) {
  return `${CLOUDINARY_BASE_URL}/${path}`;
}

export function getOptimizedImageUrl(path, width = 200, height = 200, crop = "fill") {
  return `${CLOUDINARY_BASE_URL}/upload/w_${width},h_${height},c_${crop}/${path}`;
}

export function getVideoThumbnail(path, width = 300, height = 300) {
  return `${CLOUDINARY_BASE_URL}/video/upload/w_${width},h_${height},c_fill/${path}.jpg`;
}