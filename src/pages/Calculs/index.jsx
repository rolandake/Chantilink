import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import { AuthProvider } from "../context/AuthContext";
import { CalculsProvider } from "./context/CalculsContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <CalculsProvider>
        <App />
      </CalculsProvider>
    </AuthProvider>
  </React.StrictMode>
);
