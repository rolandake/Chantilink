import React, { useEffect, useState } from "react";

export default function SplashScreen({
  onFinish,
  duration = 2500,
  appName = "ChantiLink",
  logoColor = "text-orange-600",
  bgGradient = "from-orange-500 via-orange-600 to-orange-700",
  variant = "default", // default, modern, minimal, playful
}) {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const steps = 50;
    const increment = 100 / steps;
    const intervalTime = duration / steps;

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);

    const timeout = setTimeout(() => {
      setVisible(false);
      onFinish?.();
    }, duration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timeout);
    };
  }, [duration, onFinish]);

  if (!visible) return null;

  // -------------------
  // Variant Default
  // -------------------
  if (variant === "default") {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br ${bgGradient}`}>
        <div className="flex flex-col items-center justify-center px-8 py-12 bg-white/20 backdrop-blur-md rounded-3xl shadow-2xl space-y-8 w-[90%] max-w-sm transform transition-transform duration-500">
          {/* Logo */}
          <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center bg-white shadow-2xl animate-[rotate_0.8s_cubic-bezier(0.68,-0.55,0.265,1.55)]">
            <svg className={`w-12 h-12 md:w-14 md:h-14 ${logoColor}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 2a1 1 0 00-1 1v1.26A8 8 0 004 11v2a2 2 0 002 2v2a2 2 0 002 2h8a2 2 0 002-2v-2a2 2 0 002-2v-2a8 8 0 00-4-6.74V3a1 1 0 00-1-1H9z" />
            </svg>
          </div>

          {/* Nom */}
          <div className="text-center space-y-2 animate-slide-up">
            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight">{appName}</h1>
            <p className="text-white/80 text-sm">Connectez-vous au monde</p>
          </div>

          {/* Progress */}
          <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden backdrop-blur-sm">
            <div
              className="h-full bg-white rounded-full transition-all duration-300 shadow-lg"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // -------------------
  // Variant Modern
  // -------------------
  if (variant === "modern") {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br ${bgGradient}`}>
        <div className="text-center space-y-12">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl animate-scale-in">
            <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 2a1 1 0 00-1 1v1.26A8 8 0 004 11v2a2 2 0 002 2v2a2 2 0 002 2h8a2 2 0 002-2v-2a2 2 0 002-2v-2a8 8 0 00-4-6.74V3a1 1 0 00-1-1H9z" />
            </svg>
          </div>
          <div className="space-y-4 animate-fade-slide-up">
            <h1 className="text-6xl md:text-7xl font-light text-white tracking-widest">{appName}</h1>
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 rounded-full bg-white/60 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
          {/* Progress */}
          <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden backdrop-blur-sm">
            <div className="h-full bg-white rounded-full transition-all duration-300 shadow-lg" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    );
  }

  // -------------------
  // Variant Minimal
  // -------------------
  if (variant === "minimal") {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br ${bgGradient} animate-fade-in`}>
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-xl">
            <svg className={`w-10 h-10 ${logoColor}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 2a1 1 0 00-1 1v1.26A8 8 0 004 11v2a2 2 0 002 2v2a2 2 0 002 2h8a2 2 0 002-2v-2a2 2 0 002-2v-2a8 8 0 00-4-6.74V3a1 1 0 00-1-1H9z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white">{appName}</h1>
          <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden backdrop-blur-sm">
            <div className="h-full bg-white rounded-full transition-all duration-300 shadow-lg" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    );
  }

  // -------------------
  // Variant Playful
  // -------------------
  if (variant === "playful") {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br ${bgGradient} overflow-hidden`}>
        {/* Bulles décoratives */}
        {[...Array(10)].map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white/10" style={{
            width: `${Math.random() * 100 + 50}px`,
            height: `${Math.random() * 100 + 50}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `animate-float ${Math.random() * 3 + 2}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }} />
        ))}

        <div className="relative z-10 flex flex-col items-center justify-center space-y-8">
          <div className="w-28 h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center bg-white shadow-2xl animate-bounce animate-float">
            <svg className={`w-14 h-14 md:w-16 md:h-16 ${logoColor}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 2a1 1 0 00-1 1v1.26A8 8 0 004 11v2a2 2 0 002 2v2a2 2 0 002 2h8a2 2 0 002-2v-2a2 2 0 002-2v-2a8 8 0 00-4-6.74V3a1 1 0 00-1-1H9z" />
            </svg>
          </div>
          <h1 className="text-6xl md:text-7xl font-black text-white tracking-tight">{appName}</h1>
          <p className="text-xl text-white/90 font-semibold">🎉 Préparez-vous !</p>
          <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden backdrop-blur-sm">
            <div className="h-full bg-white rounded-full transition-all duration-300 shadow-lg" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    );
  }

  return null;
}
