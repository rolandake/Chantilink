import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function Toast({ message, onClose, duration = 4000, type = "success" }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!message) {
      setIsVisible(false);
      return;
    }

    // ✅ Délai micro pour éviter les conflits de montage
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 10);

    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Attendre l'animation de sortie
    }, duration);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [message, onClose, duration]);

  if (!message) return null;

  const bgColor = type === "success" ? "bg-green-600" : type === "error" ? "bg-red-600" : "bg-blue-600";

  // ✅ Utiliser un portail pour isoler le Toast du reste de l'arbre React
  return createPortal(
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 ${bgColor} text-white px-6 py-3 rounded-lg shadow-2xl z-[9999] transition-all duration-300 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
      style={{ pointerEvents: isVisible ? "auto" : "none" }}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">
          {type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️"}
        </span>
        <span className="font-medium">{message}</span>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="ml-2 text-white/80 hover:text-white transition"
          aria-label="Fermer"
        >
          ✕
        </button>
      </div>
    </div>,
    document.body // ✅ Monté directement dans le body, pas dans l'arbre React
  );
}