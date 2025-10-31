// src/components/ProtectedAdminRoute.jsx
import React from "react";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

export default function ProtectedAdminRoute({ children }) {
  const { user, isAdmin, ready } = useAuth();

  if (!ready) return null; // ou un spinner
  if (!user || !isAdmin()) return <Navigate to="/" replace />;

  return children;
}
