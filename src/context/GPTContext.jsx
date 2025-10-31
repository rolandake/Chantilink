import React, { createContext, useContext, useState } from "react";

// Création du contexte
const GPTContext = createContext();

// Provider pour partager l'historique
export function GPTProvider({ children }) {
  const [history, setHistory] = useState([]);

  const addToHistory = (entry) => {
    setHistory((prev) => [...prev, entry]);
  };

  return (
    <GPTContext.Provider value={{ history, addToHistory }}>
      {children}
    </GPTContext.Provider>
  );
}

// Hook pour utiliser le contexte dans les composants
export function useGPT() {
  return useContext(GPTContext);
}
