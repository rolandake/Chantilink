import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";

import { AuthProvider } from "./context/AuthContext";
import { CalculationProvider } from "./context/CalculationContext";
import { ProjectsProvider } from "./context/ProjectsContext";
import { GPTProvider } from "./context/GPTContext";
import { SocketProvider } from "./context/SocketContext"; // ✅ nouveau contexte

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider> {/* ✅ Contexte WebSocket pour la messagerie */}
          <ProjectsProvider>
            <CalculationProvider> {/* ✅ corrigé ici */}
              <GPTProvider>
                <App />
              </GPTProvider>
            </CalculationProvider>
          </ProjectsProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
