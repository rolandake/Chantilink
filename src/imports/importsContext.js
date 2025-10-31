// src/imports/importsContext.js (CORRIGÉ)
import { useAuth, AuthProvider } from "../context/AuthContext";
import { PostsProvider } from "../context/PostsContext";
import { StoryProvider } from "../context/StoryContext.jsx"; // ✅ Corrigé: StoryProvider au lieu de AuthStoryProvider
import { VideosProvider } from "../context/VideoContext.jsx";
import { ToastProvider } from "../context/ToastContext";

export {
  useAuth,
  AuthProvider,
  PostsProvider,
  StoryProvider, // ✅ Exporté correctement
  VideosProvider,
  ToastProvider,
};