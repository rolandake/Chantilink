import React, { useState, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Header, SplashScreen } from "./imports/importsComponents";
import {
  useAuth,
  AuthProvider,
  PostsProvider,
  StoryProvider,
  VideosProvider,
  ToastProvider,
} from "./imports/importsContext";
import { CalculationProvider } from "./context/CalculationContext"; // ✅ AJOUT
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import { setupIndexedDB } from "./utils/idbMigration";
import { Home, MessageSquare, Video, Calculator, Mail, User, Eye } from "lucide-react";

// --- Pages lazy centralisées ---
import {
  Home as HomePage,
  Profile,
  ChatPage,
  VideosPage,
  CalculsPage,
  Messages,
  VisionPage,
  AuthPage,
} from "./imports/importsPages.js";
import AdminDashboard from "./pages/Admin/AdminDashboard.jsx";

// ==================== PARTICULES SIMPLIFIÉES ====================
function BackgroundParticles() {
  const particles = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1.5,
  }));

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 opacity-40">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-gradient-to-br from-orange-400/30 to-orange-600/30 blur-xl"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}rem`,
            height: `${particle.size}rem`,
          }}
        />
      ))}
    </div>
  );
}

// ==================== TRANSITION AUTOMNE ====================
function PageTransition({ children, disabled }) {
  const location = useLocation();
  if (disabled) return children;

  return (
    <motion.div
      key={location.pathname}
      initial={{
        opacity: 0,
        y: -30,
        scale: 0.92,
        filter: "blur(8px) brightness(1.1)",
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px) brightness(1)",
      }}
      exit={{
        opacity: 0,
        y: 100,
        scale: 0.85,
        rotateX: 25,
        filter: "blur(12px) brightness(0.7)",
      }}
      transition={{
        duration: 1,
        ease: [0.25, 0.46, 0.45, 0.94],
        y: { type: "spring", stiffness: 50, damping: 20 },
        scale: { duration: 0.95, ease: [0.16, 1, 0.3, 1] },
        opacity: { duration: 0.85 },
        rotateX: { duration: 1, ease: [0.25, 0.46, 0.45, 0.94] },
      }}
      style={{ transformStyle: "preserve-3d", transformOrigin: "center top" }}
      className="h-full w-full"
    >
      {children}
    </motion.div>
  );
}

// ==================== SPINNER ====================
function LoadingSpinner() {
  return (
    <div className="flex flex-col justify-center items-center w-full h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100">
      <div className="relative w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-3xl flex items-center justify-center text-white font-bold text-3xl shadow-xl mb-6">
        <span>C</span>
      </div>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-16 h-16 border-4 border-orange-200 border-t-orange-600 rounded-full"
      />
      <p className="mt-6 text-gray-700 font-semibold">Chargement...</p>
    </div>
  );
}

// ==================== AUTH ROUTE ====================
function AuthRoute({ children, redirectIfAuthenticated = false }) {
  const { user, loading, ready } = useAuth();
  const location = useLocation();

  if (!ready || loading) return <LoadingSpinner />;
  if (redirectIfAuthenticated && user) return <Navigate to="/" replace />;
  if (!redirectIfAuthenticated && !user)
    return <Navigate to="/auth" replace state={{ from: location }} />;
  return children;
}

// ==================== MENU ====================
const menuItems = [
  { id: "home", label: "Accueil", icon: Home, path: "/" },
  { id: "chat", label: "Assistant GPT", icon: MessageSquare, path: "/chat" },
  { id: "videos", label: "Vidéos", icon: Video, path: "/videos" },
  { id: "calculs", label: "Calculs", icon: Calculator, path: "/calculs" },
  { id: "messages", label: "Messages", icon: Mail, path: "/messages" },
  { id: "profile", label: "Profil", icon: User, path: "/profile" },
  { id: "vision", label: "Vision IA", icon: Eye, path: "/vision" },
];

// ==================== NAVBAR MOBILE ====================
function NavbarMobile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  if (!user) return null;

  const immersiveRoutes = ["/videos", "/chat", "/messages"];
  const isImmersive = immersiveRoutes.includes(location.pathname);

  return (
    <nav 
      className={`fixed bottom-0 left-0 right-0 h-16 z-50 sm:hidden transition-all duration-300 ${
        isImmersive 
          ? "backdrop-blur-md bg-white/70 border-t border-gray-200/50 shadow-sm" 
          : "backdrop-blur-xl bg-white/95 border-t border-gray-200 shadow-lg"
      }`}
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)"
      }}
    >
      <div className="flex justify-around items-center h-full px-1">
        {menuItems.map(({ id, label, icon: Icon, path }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={id}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center justify-center relative group transition-all active:scale-95 ${
                isImmersive ? "opacity-90 hover:opacity-100" : ""
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="navbar-mobile-indicator"
                  className="absolute -top-1 left-1/2 -translate-x-1/2 w-12 h-1 bg-orange-500 rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <div
                className={`relative p-2.5 rounded-xl transition-colors ${
                  isActive
                    ? "bg-gradient-to-br from-orange-500 to-orange-600 shadow-md"
                    : "bg-gray-100 group-hover:bg-gray-200"
                }`}
              >
                <Icon
                  size={20}
                  className={isActive ? "text-white" : "text-gray-700"}
                  strokeWidth={2.5}
                />
              </div>
              <span
                className={`text-[10px] mt-1 font-medium ${
                  isActive ? "text-orange-600 font-bold" : "text-gray-600"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ==================== SIDEBAR ====================
function SidebarDesktop() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  if (!user) return null;

  return (
    <aside className="hidden sm:flex sm:flex-col sm:w-24 lg:w-28 backdrop-blur-xl bg-white/95 border-r border-gray-200 fixed top-0 left-0 h-full pt-[72px] z-40 shadow-lg">
      <div className="flex-1 flex flex-col gap-3 py-6 px-3 overflow-y-auto">
        {menuItems.map(({ id, label, icon: Icon, path }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={id}
              onClick={() => navigate(path)}
              className="flex flex-col items-center justify-center py-3 w-full rounded-2xl transition-all relative group active:scale-95"
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-desktop-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-orange-500 rounded-r-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <div
                className={`relative p-3 rounded-xl transition-colors ${
                  isActive
                    ? "bg-gradient-to-br from-orange-500 to-orange-600 shadow-md"
                    : "bg-gray-100 group-hover:bg-gray-200"
                }`}
              >
                <Icon
                  size={22}
                  className={isActive ? "text-white" : "text-gray-700"}
                  strokeWidth={2.5}
                />
              </div>
              <span
                className={`text-[11px] mt-2 font-medium ${
                  isActive ? "text-orange-600 font-bold" : "text-gray-600"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

// ==================== APP ====================
export default function App() {
  const [idbReady, setIdbReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await setupIndexedDB();
        setIdbReady(true);
      } catch (err) {
        console.error("❌ [App] Erreur IDB:", err);
        setIdbReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
      );
    }
  }, []);

  if (!idbReady) return <LoadingSpinner />;

  return (
    <AuthProvider>
      <ToastProvider>
        <PostsProvider>
          <StoryProvider>
            <VideosProvider>
              {/* ✅ AJOUT DU CalculationProvider ICI */}
              <CalculationProvider>
                <Suspense fallback={<LoadingSpinner />}>
                  <AppContent />
                </Suspense>
              </CalculationProvider>
            </VideosProvider>
          </StoryProvider>
        </PostsProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

// ==================== CONTENU APP ====================
function AppContent() {
  const { user, ready } = useAuth();
  const location = useLocation();
  const [isSplashVisible, setSplashVisible] = useState(true);

  const keyboardSensitiveRoutes = ["/chat", "/messages", "/videos"];
  const isKeyboardSensitive = keyboardSensitiveRoutes.includes(location.pathname);

  if (!ready) return <LoadingSpinner />;
  if (isSplashVisible)
    return <SplashScreen onFinish={() => setSplashVisible(false)} />;

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      <BackgroundParticles />
      
      {location.pathname !== "/videos" && <Header />}
      
      <SidebarDesktop />

      <main
        className={`
          absolute 
          ${location.pathname === "/videos" ? "top-0" : "top-[72px]"}
          left-0 
          right-0 
          bottom-20
          sm:bottom-0
          sm:ml-24 
          lg:ml-28 
          z-10
          overflow-auto 
          scroll-smooth
          scrollbar-thin 
          scrollbar-thumb-orange-500 
          scrollbar-track-transparent
          bg-white
        `}
        style={{
          paddingBottom: isKeyboardSensitive 
            ? "calc(env(safe-area-inset-bottom, 0px) + 1rem)" 
            : "1rem",
        }}
      >
        <AnimatePresence mode="wait">
          <PageTransition>
            <Routes>
              <Route
                path="/auth"
                element={
                  <AuthRoute redirectIfAuthenticated>
                    <AuthPage />
                  </AuthRoute>
                }
              />
              <Route
                path="/"
                element={
                  <AuthRoute>
                    <HomePage />
                  </AuthRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <AuthRoute>
                    <ChatPage />
                  </AuthRoute>
                }
              />
              <Route
                path="/videos"
                element={
                  <AuthRoute>
                    <VideosPage />
                  </AuthRoute>
                }
              />
              <Route
                path="/vision"
                element={
                  <AuthRoute>
                    <VisionPage />
                  </AuthRoute>
                }
              />
              <Route
                path="/calculs"
                element={
                  <AuthRoute>
                    <CalculsPage />
                  </AuthRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <AuthRoute>
                    <Messages />
                  </AuthRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <AuthRoute>
                    <Profile />
                  </AuthRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <AuthRoute>
                    <ProtectedAdminRoute>
                      <AdminDashboard />
                    </ProtectedAdminRoute>
                  </AuthRoute>
                }
              />
              <Route
                path="*"
                element={<Navigate to={user ? "/" : "/auth"} replace />}
              />
            </Routes>
          </PageTransition>
        </AnimatePresence>
      </main>

      <NavbarMobile />
    </div>
  );
}