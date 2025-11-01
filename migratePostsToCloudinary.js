// backend/migratePostsToCloudinary.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== CONFIG CLOUDINARY ====================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ==================== VÉRIFICATION DES VARIABLES ====================
console.log('🔍 Vérification des variables d\'environnement...');
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('\n❌ ERREUR: MONGO_URI ou MONGODB_URI n\'est pas défini dans .env !');
  console.log('   ➜ Ajoute par exemple : MONGO_URI=mongodb://127.0.0.1:27017/chantilink\n');
  process.exit(1);
}

console.log(`MONGO_URI: ✅ ${mongoUri.includes('mongodb+srv') ? '(Cluster Atlas)' : '(Local)'}`);
console.log(`CLOUDINARY_CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME || '❌ Manquant !'}`);
console.log(`CLOUDINARY_API_KEY: ${process.env.CLOUDINARY_API_KEY ? '✅' : '❌ Manquant !'}`);
console.log(`CLOUDINARY_API_SECRET: ${process.env.CLOUDINARY_API_SECRET ? '✅' : '❌ Manquant !'}`);
console.log('\n');

// ==================== MODÈLE POST ====================
const PostSchema = new mongoose.Schema({
  content: String,
  media: [String],
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: Date
}, { timestamps: true });

const Post = mongoose.model('Post', PostSchema);

// ==================== UPLOAD CLOUDINARY ====================
async function uploadToCloudinary(localPath) {
  try {
    const fullPath = path.join(__dirname, '..', localPath);
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ Fichier introuvable: ${fullPath}`);
      return null;
    }

    const isVideo = /\.(mp4|webm|mov|avi)$/i.test(localPath);

    const result = await cloudinary.uploader.upload(fullPath, {
      folder: 'posts',
      resource_type: isVideo ? 'video' : 'image',
      transformation: isVideo ? [] : [{ quality: 'auto', fetch_format: 'auto' }]
    });

    console.log(`✅ Upload réussi: ${result.public_id}`);
    return result.public_id;

  } catch (error) {
    console.error(`❌ Erreur upload vers Cloudinary:`, error.message);
    return null;
  }
}

// ==================== MIGRATION D'UN POST ====================
async function migratePost(post) {
  try {
    console.log(`\n📝 Migration du post ${post._id}...`);

    if (!post.media || post.media.length === 0) {
      console.log('   ⏭️  Aucun média à migrer');
      return { success: true, skipped: true };
    }

    const newMediaUrls = [];

    for (const mediaUrl of post.media) {
      if (mediaUrl.includes('cloudinary.com') || !mediaUrl.startsWith('/uploads/')) {
        console.log(`   ✓ Déjà sur Cloudinary: ${mediaUrl}`);
        newMediaUrls.push(mediaUrl);
        continue;
      }

      console.log(`   🔄 Migration de: ${mediaUrl}`);
      const publicId = await uploadToCloudinary(mediaUrl);

      if (publicId) newMediaUrls.push(publicId);
      else {
        console.log(`   ⚠️  Conservation de l'ancien URL`);
        newMediaUrls.push(mediaUrl);
      }
    }

    post.media = newMediaUrls;
    await post.save();

    console.log(`   ✅ Post ${post._id} migré avec succès`);
    return { success: true, migrated: true };

  } catch (error) {
    console.error(`   ❌ Erreur migration post ${post._id}:`, error.message);
    return { success: false, error: error.message };
  }
}

// ==================== SCRIPT PRINCIPAL ====================
async function main() {
  try {
    console.log('🚀 Démarrage de la migration vers Cloudinary...\n');

    await mongoose.connect(mongoUri);
    console.log('✅ Connecté à MongoDB\n');

    const posts = await Post.find({ media: { $exists: true, $ne: [] } });
    console.log(`📊 ${posts.length} posts trouvés avec des médias\n`);

    let migrated = 0, skipped = 0, failed = 0;

    for (const post of posts) {
      const result = await migratePost(post);
      if (result.success) {
        if (result.migrated) migrated++;
        if (result.skipped) skipped++;
      } else failed++;
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 RÉSUMÉ DE LA MIGRATION');
    console.log('='.repeat(50));
    console.log(`✅ Posts migrés: ${migrated}`);
    console.log(`⏭️  Posts ignorés: ${skipped}`);
    console.log(`❌ Posts échoués: ${failed}`);
    console.log(`📝 Total traités: ${posts.length}`);
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Migration terminée, déconnexion MongoDB');
    process.exit(0);
  }
}

main();
