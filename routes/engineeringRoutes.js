// ========================================
// routes/engineeringRoutes.js
// ========================================
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================================
// CONFIGURATION MULTER POUR UPLOADS
// ========================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'engineering');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Type de fichier non autorisé'));
  }
});

// ========================================
// UPLOAD FILE
// ========================================
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }
    
    const fileUrl = `/uploads/engineering/${req.file.filename}`;
    
    res.json({
      success: true,
      message: 'Fichier uploadé avec succès',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: fileUrl,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload du fichier' });
  }
});

// ========================================
// UPLOAD MULTIPLE FILES
// ========================================
router.post('/upload-multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }
    
    const files = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      url: `/uploads/engineering/${file.filename}`,
      mimetype: file.mimetype
    }));
    
    res.json({
      success: true,
      message: `${files.length} fichier(s) uploadé(s) avec succès`,
      files
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload multiple:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload des fichiers' });
  }
});

// ========================================
// GET ALL FILES
// ========================================
router.get('/files', async (req, res) => {
  try {
    const uploadDir = path.join(process.cwd(), 'uploads', 'engineering');
    
    if (!fs.existsSync(uploadDir)) {
      return res.json({ success: true, files: [] });
    }
    
    const files = fs.readdirSync(uploadDir).map(filename => {
      const filePath = path.join(uploadDir, filename);
      const stats = fs.statSync(filePath);
      
      return {
        filename,
        size: stats.size,
        url: `/uploads/engineering/${filename}`,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    });
    
    res.json({ success: true, files });
  } catch (error) {
    console.error('Erreur lors de la récupération des fichiers:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========================================
// DELETE FILE
// ========================================
router.delete('/files/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'uploads', 'engineering', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier introuvable' });
    }
    
    fs.unlinkSync(filePath);
    
    res.json({ 
      success: true, 
      message: 'Fichier supprimé avec succès' 
    });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========================================
// GET FILE INFO
// ========================================
router.get('/files/:filename/info', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'uploads', 'engineering', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fichier introuvable' });
    }
    
    const stats = fs.statSync(filePath);
    
    res.json({
      success: true,
      file: {
        filename,
        size: stats.size,
        url: `/uploads/engineering/${filename}`,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des infos:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;