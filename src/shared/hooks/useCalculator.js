// ============================================
// 📁 shared/hooks/useCalculator.js
// Debounce intégré pour updateInput
// ============================================
import { useState, useCallback, useMemo, useRef } from 'react';
import { StorageManager } from '../../core/storage/StorageManager';

export function useCalculator(CalculatorClass, type, domain = 'tp', debounceDelay = 300) {
  const storageKey = `${domain}_${type}`;
  
  const [inputs, setInputs] = useState({});
  const [history, setHistory] = useState(() => StorageManager.getHistory(storageKey));
  const [error, setError] = useState(null);

  const debounceTimers = useRef({});

  // Mise à jour d'un champ avec debounce
  const updateInput = useCallback((field, value) => {
    // Clear ancien timer
    if (debounceTimers.current[field]) {
      clearTimeout(debounceTimers.current[field]);
    }

    // Set nouveau timer
    debounceTimers.current[field] = setTimeout(() => {
      setInputs(prev => ({ ...prev, [field]: value }));
      setError(null);
      debounceTimers.current[field] = null;
    }, debounceDelay);
  }, [debounceDelay]);

  // Mise à jour de plusieurs champs sans debounce
  const updateInputs = useCallback((newInputs) => {
    setInputs(prev => ({ ...prev, ...newInputs }));
    setError(null);
  }, []);

  // Réinitialisation
  const reset = useCallback(() => {
    setInputs({});
    setError(null);
  }, []);

  // Calcul automatique avec gestion d'erreur
  const results = useMemo(() => {
    try {
      const calculator = new CalculatorClass(inputs);
      if (!calculator.validate()) {
        return null;
      }
      const res = calculator.getResults();
      setError(null);
      return res;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, [inputs, CalculatorClass]);

  // Sauvegarde dans l'historique
  const saveToHistory = useCallback(() => {
    if (!results) {
      setError('Aucun résultat à sauvegarder');
      return false;
    }

    const entry = { inputs, results, domain, type };
    if (StorageManager.addToHistory(storageKey, entry)) {
      setHistory(StorageManager.getHistory(storageKey));
      return true;
    }
    setError('Erreur lors de la sauvegarde');
    return false;
  }, [inputs, results, storageKey, domain, type]);

  // Suppression d'une entrée
  const deleteFromHistory = useCallback((id) => {
    if (StorageManager.removeFromHistory(storageKey, id)) {
      setHistory(StorageManager.getHistory(storageKey));
      return true;
    }
    return false;
  }, [storageKey]);

  // Vider l'historique
  const clearHistory = useCallback(() => {
    if (StorageManager.clearHistory(storageKey)) {
      setHistory([]);
      return true;
    }
    return false;
  }, [storageKey]);

  // Charger depuis l'historique
  const loadFromHistory = useCallback((entry) => {
    if (entry && entry.inputs) {
      setInputs(entry.inputs);
      setError(null);
    }
  }, []);

  return {
    inputs,
    results,
    error,
    history,
    updateInput,
    updateInputs,
    reset,
    saveToHistory,
    deleteFromHistory,
    clearHistory,
    loadFromHistory,
    domain,
    type,
  };
}
