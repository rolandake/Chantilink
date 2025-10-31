// src/context/ToastContext.jsx
import React, { createContext, useContext, useState } from "react";

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast doit être utilisé dans un ToastProvider");
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // Ajouter un toast
  const addToast = (message, type = "success") => {
    const id = Date.now();
    console.log("[TOAST CONTEXT] 📢 Nouveau toast ajouté :", { id, message, type });
    
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Supprimer automatiquement après 3s
    setTimeout(() => {
      console.log("[TOAST CONTEXT] 🗑️ Toast supprimé :", id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Affichage des toasts */}
      <div className="fixed top-5 right-5 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${
              t.type === "error" ? "bg-red-500" : "bg-orange-500"
            } text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};