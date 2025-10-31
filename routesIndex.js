// backend/routesIndex.js

// Import des routes
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/users.js";
import followRoutes from "./routes/follow.js";
import storyRoutes from "./routes/storyRoutes.js";
import gptConvoRoutes from "./routes/gptConversations.js";
import calculationRoutes from "./routes/calculations.js";
import devisRoutes from "./routes/devis.js";
import messagesRoutes from "./routes/messages.js";
import monetisationRoutes from "./routes/monetisation.js";
import uploadRoutes from "./routes/upload.js";
import videosRoutes from "./routes/videos.js";
import postsRoutes from "./routes/posts.js";
import adminRoutes from "./routes/adminRoutes.js";

// Middlewares
import {
  verifyToken,
  verifyTokenAdmin,
  verifyVerifiedUser,
  verifyPremiumUser,
} from "./middleware/auth.js";

// Export de toutes les routes et middlewares
export {
  authRoutes,
  userRoutes,
  followRoutes,
  storyRoutes,
  gptConvoRoutes,
  calculationRoutes,
  devisRoutes,
  messagesRoutes,
  monetisationRoutes,
  uploadRoutes,
  videosRoutes,
  postsRoutes,
  adminRoutes,
  verifyToken,
  verifyTokenAdmin,
  verifyVerifiedUser,
  verifyPremiumUser,
};