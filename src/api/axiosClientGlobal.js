// src/api/axiosClientGlobal.js
import axios from "axios";

// Utilise la variable d'environnement Vite pour la prod, fallback local
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Intercepteur pour injecter le token automatiquement
export const injectAuthHandlers = ({ getToken }) => {
  axiosClient.interceptors.request.use(async (config) => {
    const token = await getToken?.();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
};

export default axiosClient;
