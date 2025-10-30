// ========================================
// routes/devRoutes.js - Routes de développement
// ========================================
import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Post from '../models/Post.js';

const router = express.Router();

// ========================================
// HEALTHCHECK DÉTAILLÉ
// ========================================
router.get('/health', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    const [userCount, postCount] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments()
    ]);

    res.json({
      success: true,
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version
      },
      database: {
        status: dbStates[dbState],
        connected: dbState === 1,
        host: mongoose.connection.host,
        name: mongoose.connection.name
      },
      collections: {
        users: userCount,
        posts: postCount
      }
    });
  } catch (error) {
    console.error('Erreur healthcheck:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du healthcheck',
      details: error.message
    });
  }
});

// ========================================
// TEST DATABASE CONNECTION
// ========================================
router.get('/db-test', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({
      success: true,
      message: 'Connexion à MongoDB fonctionnelle',
      database: mongoose.connection.name
    });
  } catch (error) {
    console.error('Erreur test DB:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur de connexion à MongoDB',
      details: error.message
    });
  }
});

// ========================================
// CLEAR ALL DATA (DEV ONLY - DANGEROUS!)
// ========================================
router.delete('/clear-all', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ 
      error: 'Cette action n\'est pas autorisée en production' 
    });
  }

  try {
    await Promise.all([
      User.deleteMany({}),
      Post.deleteMany({})
    ]);

    res.json({
      success: true,
      message: 'Toutes les données ont été supprimées'
    });
  } catch (error) {
    console.error('Erreur clear-all:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression',
      details: error.message
    });
  }
});

// ========================================
// GET SYSTEM INFO
// ========================================
router.get('/system-info', (req, res) => {
  res.json({
    success: true,
    system: {
      platform: process.platform,
      architecture: process.arch,
      nodeVersion: process.version,
      cpus: require('os').cpus().length,
      totalMemory: require('os').totalmem(),
      freeMemory: require('os').freemem(),
      uptime: process.uptime()
    },
    process: {
      pid: process.pid,
      memory: process.memoryUsage(),
      versions: process.versions
    }
  });
});

// ========================================
// TEST ERROR HANDLER
// ========================================
router.get('/test-error', (req, res, next) => {
  const error = new Error('Ceci est une erreur de test');
  error.status = 418; // I'm a teapot
  next(error);
});

// ========================================
// CREATE TEST USER
// ========================================
router.post('/create-test-user', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ 
      error: 'Cette action n\'est pas autorisée en production' 
    });
  }

  try {
    const testUser = new User({
      email: `test${Date.now()}@example.com`,
      password: 'Test123456!',
      username: `testuser${Date.now()}`,
      fullName: 'Test User',
      isVerified: true
    });

    await testUser.save();

    res.json({
      success: true,
      message: 'Utilisateur de test créé',
      user: {
        id: testUser._id,
        email: testUser.email,
        username: testUser.username
      }
    });
  } catch (error) {
    console.error('Erreur création test user:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création',
      details: error.message
    });
  }
});

// ========================================
// GET ENVIRONMENT VARIABLES (SAFE)
// ========================================
router.get('/env', (req, res) => {
  const safeEnv = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    HAS_JWT_SECRET: !!process.env.JWT_SECRET,
    HAS_MONGODB_URI: !!process.env.MONGODB_URI,
    HAS_DISCORD_WEBHOOK: !!process.env.DISCORD_WEBHOOK,
    FRONTEND_URLS: process.env.FRONTEND_URLS
  };

  res.json({
    success: true,
    environment: safeEnv
  });
});

export default router;