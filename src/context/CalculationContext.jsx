import React, {
  createContext,
  useState,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useEffect
} from "react";
import { useDebouncedCallback } from "use-debounce";

// -------------------------
// CONSTANTES
// -------------------------
const DEBOUNCE_DELAY = 200;
const MESSAGE_AUTO_CLEAR_DELAY = 5000;
const ERROR_AUTO_CLEAR_DELAY = 8000;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;
const REQUEST_TIMEOUT = 30000;

export const PROJECT_TYPES = {
  BATIMENT: "batiment",
  TP: "tp",
  FERROVIAIRE: "ferroviaire",
  ENERGIE: "energie",
  ECO: "eco",
};

export const ERROR_CODES = {
  AUTH_MISSING: "AUTH_MISSING",
  AUTH_INVALID: "AUTH_INVALID",
  NETWORK_ERROR: "NETWORK_ERROR",
  SERVER_ERROR: "SERVER_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  TIMEOUT: "TIMEOUT",
  DUPLICATE: "DUPLICATE",
  RATE_LIMIT: "RATE_LIMIT",
  UNKNOWN: "UNKNOWN",
};

export const ERROR_MESSAGES = {
  [ERROR_CODES.AUTH_MISSING]:
    "Token d'authentification manquant. Veuillez vous reconnecter.",
  [ERROR_CODES.AUTH_INVALID]:
    "Session expirée. Veuillez vous reconnecter.",
  [ERROR_CODES.NETWORK_ERROR]:
    "Erreur de connexion. Vérifiez votre connexion internet.",
  [ERROR_CODES.SERVER_ERROR]:
    "Erreur serveur. Veuillez réessayer plus tard.",
  [ERROR_CODES.VALIDATION_ERROR]:
    "Données invalides. Vérifiez vos saisies.",
  [ERROR_CODES.NOT_FOUND]: "Ressource introuvable.",
  [ERROR_CODES.TIMEOUT]:
    "La requête a expiré. Veuillez réessayer.",
  [ERROR_CODES.DUPLICATE]:
    "Ce calcul existe déjà.",
  [ERROR_CODES.RATE_LIMIT]:
    "Trop de requêtes. Veuillez patienter.",
  [ERROR_CODES.UNKNOWN]:
    "Une erreur inattendue s'est produite.",
};

// -------------------------
// CONTEXT
// -------------------------
export const CalculationContext = createContext(null);
export const useCalculation = () => {
  const context = useContext(CalculationContext);
  if (!context)
    throw new Error(
      "useCalculation doit être utilisé dans un CalculationProvider"
    );
  return context;
};

// -------------------------
// ERROR CLASS
// -------------------------
class CalculationError extends Error {
  constructor(message, code = ERROR_CODES.UNKNOWN, details = null) {
    super(message);
    this.name = "CalculationError";
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// -------------------------
// HTTP CLIENT SANS REDIRECTION
// -------------------------
class HttpClient {
  constructor(baseURL, getAuthToken) {
    this.baseURL = baseURL;
    this.getAuthToken = getAuthToken;
    this.abortControllers = new Map();
  }

  async request(endpoint, options = {}, retryCount = 0) {
    const requestId = `${endpoint}-${Date.now()}`;
    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);

    try {
      const token = this.getAuthToken();
      if (!token) {
        throw new CalculationError(
          ERROR_MESSAGES[ERROR_CODES.AUTH_MISSING],
          ERROR_CODES.AUTH_MISSING
        );
      }

      const timeout = setTimeout(
        () => controller.abort(),
        options.timeout || REQUEST_TIMEOUT
      );

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
        credentials: "include",
        signal: controller.signal,
      });

      clearTimeout(timeout);
      this.abortControllers.delete(requestId);

      if (!response.ok) {
        if ([401, 403].includes(response.status)) {
          // ❌ Pas de redirection ici
          throw new CalculationError(
            ERROR_MESSAGES[ERROR_CODES.AUTH_INVALID],
            ERROR_CODES.AUTH_INVALID
          );
        }

        if (response.status === 404)
          throw new CalculationError(
            ERROR_MESSAGES[ERROR_CODES.NOT_FOUND],
            ERROR_CODES.NOT_FOUND
          );

        if (response.status === 429)
          throw new CalculationError(
            ERROR_MESSAGES[ERROR_CODES.RATE_LIMIT],
            ERROR_CODES.RATE_LIMIT
          );

        if (response.status >= 500)
          throw new CalculationError(
            ERROR_MESSAGES[ERROR_CODES.SERVER_ERROR],
            ERROR_CODES.SERVER_ERROR
          );

        try {
          const errorData = await response.json();
          throw new CalculationError(
            errorData.message || `Erreur HTTP ${response.status}`,
            ERROR_CODES.UNKNOWN,
            { status: response.status, data: errorData }
          );
        } catch {
          throw new CalculationError(
            `Erreur HTTP ${response.status}`,
            ERROR_CODES.UNKNOWN,
            { status: response.status }
          );
        }
      }

      return await response.json();
    } catch (err) {
      this.abortControllers.delete(requestId);

      if (
        (err.name === "AbortError" ||
          err.code === ERROR_CODES.NETWORK_ERROR) &&
        retryCount < MAX_RETRY_ATTEMPTS
      ) {
        await new Promise((r) =>
          setTimeout(r, RETRY_DELAY * (retryCount + 1))
        );
        return this.request(endpoint, options, retryCount + 1);
      }

      if (err.name === "AbortError")
        throw new CalculationError(
          ERROR_MESSAGES[ERROR_CODES.TIMEOUT],
          ERROR_CODES.TIMEOUT
        );

      if (err instanceof CalculationError) throw err;

      throw new CalculationError(
        ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR],
        ERROR_CODES.NETWORK_ERROR,
        { originalError: err.message }
      );
    }
  }

  cancelAll() {
    this.abortControllers.forEach((c) => c.abort());
    this.abortControllers.clear();
  }
}

// -------------------------
// PROVIDER
// -------------------------
export function CalculationProvider({ children }) {
  const [localInputs, setLocalInputs] = useState({});
  const [localResults, setLocalResults] = useState({});
  const [savedCalculations, setSavedCalculations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [currentProjectType, setCurrentProjectType] = useState(null);
  const [currentCalculationType, setCurrentCalculationType] = useState(null);
  const [operationInProgress, setOperationInProgress] = useState(null);

  const API_URL = useMemo(
    () => import.meta.env.VITE_API_URL || "http://localhost:5000",
    []
  );
  const messageTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  const getAuthToken = useCallback(
    () => localStorage.getItem("token"),
    []
  );

  const httpClient = useMemo(
    () => new HttpClient(API_URL, getAuthToken),
    [API_URL, getAuthToken]
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      httpClient.cancelAll();
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    };
  }, [httpClient]);

  const setTimedMessage = useCallback(
    (setter, message, delay) => {
      if (!isMountedRef.current) return;
      setter(message);
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
      messageTimerRef.current = setTimeout(
        () => isMountedRef.current && setter(null),
        delay
      );
    },
    []
  );

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
  }, []);

  const computeResults = useCallback(
    (inputs) => ({ computed: true, ...inputs }),
    []
  );

  const debouncedComputeResults = useDebouncedCallback(
    (inputs) =>
      isMountedRef.current && setLocalResults(computeResults(inputs)),
    DEBOUNCE_DELAY
  );

  const updateInput = useCallback(
    (field, value) =>
      setLocalInputs((prev) => {
        const updated = { ...prev, [field]: value };
        debouncedComputeResults(updated);
        return updated;
      }),
    [debouncedComputeResults]
  );

  const saveCalculation = useCallback(
    async (customData = null, projectType = null, calcType = null) => {
      if (operationInProgress === "save")
        return { ok: false, error: "Opération déjà en cours" };

      try {
        setLoading(true);
        setOperationInProgress("save");
        clearMessages();

        const dataToSave = customData || {
          inputs: localInputs,
          results: localResults,
        };

        const finalData = {
          projectType: projectType || currentProjectType,
          calculationType: calcType || currentCalculationType,
          inputs: dataToSave.inputs,
          results: dataToSave.results,
          savedAt: new Date().toISOString(),
        };

        const saved = await httpClient.request("/api/calculs", {
          method: "POST",
          body: JSON.stringify(finalData),
        });

        if (isMountedRef.current) {
          setSavedCalculations((prev) => [saved, ...prev]);
          setTimedMessage(
            setSuccess,
            "✅ Calcul sauvegardé avec succès !",
            MESSAGE_AUTO_CLEAR_DELAY
          );
        }

        return { ok: true, data: saved };
      } catch (err) {
        if (isMountedRef.current)
          setTimedMessage(
            setError,
            `❌ ${err.message || ERROR_MESSAGES[ERROR_CODES.UNKNOWN]}`,
            ERROR_AUTO_CLEAR_DELAY
          );
        return { ok: false, error: err.message, code: err.code };
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setOperationInProgress(null);
        }
      }
    },
    [
      operationInProgress,
      localInputs,
      localResults,
      currentProjectType,
      currentCalculationType,
      httpClient,
      setTimedMessage,
      clearMessages,
    ]
  );

  const fetchSavedCalculations = useCallback(
    async (filters = {}) => {
      if (operationInProgress === "fetch")
        return { ok: false, error: "Opération déjà en cours" };

      try {
        setLoading(true);
        setOperationInProgress("fetch");
        clearMessages();

        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = `/api/calculs${
          queryParams ? `?${queryParams}` : ""
        }`;

        const data = await httpClient.request(endpoint, { method: "GET" });

        if (isMountedRef.current) {
          setSavedCalculations((prev) => {
            if (filters.offset && filters.offset > 0)
              return [
                ...prev,
                ...(Array.isArray(data)
                  ? data
                  : data.calculs || []),
              ];
            return Array.isArray(data) ? data : data.calculs || [];
          });
        }

        return { ok: true, data };
      } catch (err) {
        if (isMountedRef.current)
          setTimedMessage(
            setError,
            `❌ ${err.message || ERROR_MESSAGES[ERROR_CODES.UNKNOWN]}`,
            ERROR_AUTO_CLEAR_DELAY
          );
        return { ok: false, error: err.message, code: err.code };
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setOperationInProgress(null);
        }
      }
    },
    [operationInProgress, httpClient, setTimedMessage, clearMessages]
  );

  const contextValue = useMemo(
    () => ({
      localInputs,
      localResults,
      savedCalculations,
      loading,
      error,
      success,
      currentProjectType,
      currentCalculationType,
      operationInProgress,
      updateInput,
      computeResults,
      saveCalculation,
      fetchSavedCalculations,
      clearMessages,
    }),
    [
      localInputs,
      localResults,
      savedCalculations,
      loading,
      error,
      success,
      currentProjectType,
      currentCalculationType,
      operationInProgress,
      updateInput,
      computeResults,
      saveCalculation,
      fetchSavedCalculations,
      clearMessages,
    ]
  );

  return (
    <CalculationContext.Provider value={contextValue}>
      {children}
    </CalculationContext.Provider>
  );
}
