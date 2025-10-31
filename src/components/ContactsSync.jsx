import React, { useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

// ========================================
// CONFIGURATION & CONSTANTS
// ========================================
const CONFIG = {
  MAX_CONTACTS_PER_BATCH: 1000,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  REQUEST_TIMEOUT: 30000, // 30s
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  PHONE_REGEX: /^\+?[1-9]\d{1,14}$/,
  SUPPORTED_FILE_TYPES: ['.csv', '.vcf', '.txt'],
  API_ENDPOINTS: {
    SYNC: '/api/contacts/sync',
  },
};

// ========================================
// MESSAGES
// ========================================
const MESSAGES = {
  errors: {
    fileTooBig: `Le fichier est trop volumineux (max ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`,
    invalidFileType: 'Format de fichier non supporté',
    tooManyContacts: `Maximum ${CONFIG.MAX_CONTACTS_PER_BATCH} contacts par import`,
    networkError: 'Erreur de connexion. Vérifiez votre internet.',
    invalidPhone: 'Numéro de téléphone invalide',
    emptyFile: 'Le fichier est vide',
    parseError: 'Erreur lors de la lecture du fichier',
    unauthorized: 'Session expirée. Veuillez vous reconnecter.',
    rateLimit: 'Trop de requêtes. Veuillez patienter.',
    timeout: 'La requête a expiré. Réessayez.',
    serverError: 'Erreur serveur. Veuillez réessayer plus tard.',
  },
  success: {
    sync: 'Synchronisation réussie !',
    added: 'Contact ajouté avec succès',
  },
  warnings: {
    duplicates: 'contacts en double ont été ignorés',
    invalidContacts: 'contacts invalides ont été ignorés',
  },
};

// ========================================
// UTILS
// ========================================
class ContactValidator {
  static validatePhone(phone) {
    if (!phone) return null;
    const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
    return CONFIG.PHONE_REGEX.test(cleaned) ? cleaned : null;
  }

  static sanitizeContact(contact) {
    if (!contact || typeof contact !== 'object') return null;
    const name = contact.name?.trim().substring(0, 100);
    const phone = this.validatePhone(contact.phone);
    if (!name || !phone) return null;
    return { name, phone };
  }

  static removeDuplicates(contacts) {
    const seen = new Set();
    const unique = [];
    for (const contact of contacts) {
      const key = `${contact.phone}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(contact);
      }
    }
    return { unique, duplicateCount: contacts.length - unique.length };
  }
}

class FileParser {
  static parseCSV(text) {
    const contacts = [];
    const lines = text.split('\n');
    const startIndex = lines[0]?.toLowerCase().includes('nom') ? 1 : 0;
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
      if (!parts || parts.length < 2) continue;
      const name = parts[0].replace(/^"|"$/g, '').trim();
      const phone = parts[1].replace(/^"|"$/g, '').trim();
      const sanitized = ContactValidator.sanitizeContact({ name, phone });
      if (sanitized) contacts.push(sanitized);
    }
    return contacts;
  }

  static parseVCard(text) {
    const contacts = [];
    const vCards = text.split(/BEGIN:VCARD/i);
    for (const card of vCards) {
      if (!card.trim()) continue;
      const nameMatch = card.match(/FN:(.*?)[\r\n]/i);
      const phoneMatches = card.match(/TEL[^:]*:(.*?)[\r\n]/gi);
      if (nameMatch && phoneMatches) {
        const name = nameMatch[1].trim();
        for (const phoneMatch of phoneMatches) {
          const phone = phoneMatch.split(':')[1]?.trim();
          const sanitized = ContactValidator.sanitizeContact({ name, phone });
          if (sanitized) {
            contacts.push(sanitized);
            break;
          }
        }
      }
    }
    return contacts;
  }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ========================================
// API SERVICE
// ========================================
class ContactsAPI {
  static getBaseURL() {
    return import.meta.env.VITE_API_URL || "http://localhost:5000";
  }

  static async makeRequest(endpoint, data, token, onProgress = null, attempt = 1) {
    try {
      const response = await axios.post(`${this.getBaseURL()}${endpoint}`, data, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        timeout: CONFIG.REQUEST_TIMEOUT,
        onUploadProgress: progressEvent => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        },
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        switch (error.response.status) {
          case 401: throw new Error(MESSAGES.errors.unauthorized);
          case 429: throw new Error(MESSAGES.errors.rateLimit);
          case 500: case 502: case 503:
            if (attempt < CONFIG.RETRY_ATTEMPTS) {
              await sleep(CONFIG.RETRY_DELAY * attempt);
              return this.makeRequest(endpoint, data, token, onProgress, attempt + 1);
            }
            throw new Error(MESSAGES.errors.serverError);
          default: throw new Error(error.response.data?.message || 'Erreur inconnue');
        }
      }
      if (error.code === 'ECONNABORTED') throw new Error(MESSAGES.errors.timeout);
      if (error.message === 'Network Error') {
        if (attempt < CONFIG.RETRY_ATTEMPTS) {
          await sleep(CONFIG.RETRY_DELAY * attempt);
          return this.makeRequest(endpoint, data, token, onProgress, attempt + 1);
        }
        throw new Error(MESSAGES.errors.networkError);
      }
      throw error;
    }
  }

  static async syncContacts(contacts, token, onProgress = null) {
    const sanitized = contacts.map(c => ContactValidator.sanitizeContact(c)).filter(Boolean);
    if (!sanitized.length) throw new Error('Aucun contact valide à synchroniser');
    const { unique, duplicateCount } = ContactValidator.removeDuplicates(sanitized);
    // Batch processing
    const batchSize = 100;
    const batches = [];
    for (let i = 0; i < unique.length; i += batchSize) batches.push(unique.slice(i, i + batchSize));
    const results = { stats: { total: 0, onChantilink: 0, notOnChantilink: 0 }, contacts: [], warnings: [] };
    for (let i = 0; i < batches.length; i++) {
      const batchResult = await this.makeRequest(CONFIG.API_ENDPOINTS.SYNC, { contacts: batches[i] }, token, progress => {
        if (onProgress) {
          const totalProgress = Math.round(((i * 100) + progress) / batches.length);
          onProgress(totalProgress);
        }
      });
      results.stats.total += batchResult.stats?.total || 0;
      results.stats.onChantilink += batchResult.stats?.onChantilink || 0;
      results.stats.notOnChantilink += batchResult.stats?.notOnChantilink || 0;
      results.contacts.push(...(batchResult.contacts || []));
    }
    if (duplicateCount > 0) results.warnings.push(`${duplicateCount} ${MESSAGES.warnings.duplicates}`);
    return results;
  }
}

// ========================================
// MAIN COMPONENT
// ========================================
export default function ContactsSync({ onSyncComplete, token }) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [progress, setProgress] = useState(0);
  const [showManualModal, setShowManualModal] = useState(false);
  const fileInputRef = useRef(null);

  const demoContacts = useMemo(() => [
    { name: "Chantilink", phone: "+2250769144101" },
    { name: "Edi", phone: "+2250769144102" },
  ], []);

  const resetState = useCallback(() => { setError(null); setWarnings([]); setProgress(0); }, []);

  const handleSyncWeb = useCallback(async () => {
    setSyncing(true); resetState();
    try {
      const data = await ContactsAPI.syncContacts(demoContacts, token, setProgress);
      setResult(data); if (data.warnings) setWarnings(data.warnings);
      if (onSyncComplete) onSyncComplete(data);
    } catch (err) { console.error(err); setError(err.message || 'Erreur inconnue'); }
    finally { setSyncing(false); setProgress(0); }
  }, [demoContacts, token, onSyncComplete, resetState]);

  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setSyncing(true); resetState();
    try {
      if (file.size > CONFIG.MAX_FILE_SIZE) throw new Error(MESSAGES.errors.fileTooBig);
      const fileExt = '.' + file.name.split('.').pop().toLowerCase();
      if (!CONFIG.SUPPORTED_FILE_TYPES.includes(fileExt)) throw new Error(MESSAGES.errors.invalidFileType);
      const text = await file.text(); if (!text.trim()) throw new Error(MESSAGES.errors.emptyFile);
      let contacts = [], invalidCount = 0;
      try { 
        if (fileExt === '.csv' || fileExt === '.txt') { contacts = FileParser.parseCSV(text); invalidCount = text.split('\n').length - contacts.length; }
        else if (fileExt === '.vcf') { contacts = FileParser.parseVCard(text); invalidCount = (text.match(/BEGIN:VCARD/gi)?.length || 0) - contacts.length; }
      } catch { throw new Error(MESSAGES.errors.parseError); }
      if (!contacts.length) throw new Error('Aucun contact valide trouvé dans le fichier');
      if (contacts.length > CONFIG.MAX_CONTACTS_PER_BATCH) throw new Error(MESSAGES.errors.tooManyContacts);
      const data = await ContactsAPI.syncContacts(contacts, token, setProgress);
      const warningsArr = data.warnings || [];
      if (invalidCount > 0) warningsArr.push(`${invalidCount} ${MESSAGES.warnings.invalidContacts}`);
      setResult(data); if (warningsArr.length > 0) setWarnings(warningsArr);
      if (onSyncComplete) onSyncComplete(data);
    } catch (err) { console.error(err); setError(err.message || 'Erreur inconnue'); }
    finally { setSyncing(false); setProgress(0); if (fileInputRef.current) fileInputRef.current.value = ''; }
  }, [token, onSyncComplete, resetState]);

  const handleSkip = useCallback(() => { if (onSyncComplete) onSyncComplete(null); }, [onSyncComplete]);

  const handleManualSuccess = useCallback((newContact) => {
    setShowManualModal(false);
    
    // Construire le résultat mis à jour AVANT de l'utiliser
    setResult(prev => {
      const updatedResult = {
        stats: {
          total: (prev?.stats.total || 0) + 1,
          onChantilink: (prev?.stats.onChantilink || 0) + (newContact.isOnChantilink ? 1 : 0),
          notOnChantilink: (prev?.stats.notOnChantilink || 0) + (newContact.isOnChantilink ? 0 : 1),
        },
        contacts: [...(prev?.contacts || []), newContact],
      };
      
      // Notifier le parent avec les données à jour
      if (onSyncComplete) {
        onSyncComplete(updatedResult);
      }
      
      return updatedResult;
    });
  }, [onSyncComplete]);

  return (
    <motion.div className="bg-gray-900 rounded-2xl p-6 shadow-lg border border-gray-700/50 backdrop-blur-sm">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">📱 Synchroniser vos contacts</h2>
        <p className="text-gray-400 text-sm">Trouver vos amis déjà sur Chantilink !</p>
      </div>

      {syncing && progress > 0 && (
        <div className="mb-4">
          <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
            <motion.div style={{ width: `${progress}%` }} className="h-full bg-gradient-to-r from-orange-500 to-pink-500" />
          </div>
          <p className="text-xs text-gray-400 text-center mt-1">{progress}% terminé</p>
        </div>
      )}

      <div className="space-y-3 mb-6">
        <button onClick={handleSyncWeb} disabled={syncing} className="w-full p-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl font-semibold flex justify-center items-center gap-2 disabled:opacity-50">
          🔄 Synchroniser (Démo)
        </button>
        <label className={`w-full p-3 bg-gray-700/80 rounded-xl flex justify-center items-center gap-2 cursor-pointer ${syncing ? 'opacity-50 pointer-events-none' : ''}`}>
          📄 Importer un fichier
          <input ref={fileInputRef} type="file" accept=".csv,.vcf,.txt" onChange={handleFileUpload} className="hidden" disabled={syncing} />
        </label>
        <button onClick={() => setShowManualModal(true)} disabled={syncing} className="w-full p-3 bg-gray-700/80 rounded-xl text-white font-medium flex justify-center items-center gap-2 disabled:opacity-50">
          ➕ Ajouter un contact manuellement
        </button>
        {onSyncComplete && <button onClick={handleSkip} disabled={syncing} className="w-full p-2 text-gray-400 rounded-xl border border-gray-700 hover:bg-gray-800/50 disabled:opacity-50 flex justify-center items-center gap-2">↩️ Passer cette étape</button>}
      </div>

      {/* Warnings */}
      <AnimatePresence>
        {warnings.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-3 mb-4">
            {warnings.map((w, i) => <p key={i} className="text-xs text-yellow-300">⚠️ {w}</p>)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-green-500/20 border border-green-500 rounded-xl p-4 mb-4">
            <p className="text-green-300 text-sm">✅ {MESSAGES.success.sync} - {result.stats.total} contacts</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Modal */}
      <AnimatePresence>
        {showManualModal && (
          <ManualContactModal onClose={() => setShowManualModal(false)} token={token} onSuccess={handleManualSuccess} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ========================================
// MANUAL CONTACT MODAL
// ========================================
function ManualContactModal({ onClose, token, onSuccess }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); 
    setError(null);
    
    try {
      const sanitized = ContactValidator.sanitizeContact({ name, phone });
      if (!sanitized) throw new Error(MESSAGES.errors.invalidPhone);
      
      // Appel réel à l'API backend
      const response = await axios.post(
        `${ContactsAPI.getBaseURL()}/api/contacts/add`, 
        sanitized, 
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: CONFIG.REQUEST_TIMEOUT
        }
      );
      
      if (response.data.success && response.data.contact) {
        onSuccess(response.data.contact);
      } else {
        throw new Error('Erreur lors de l\'ajout du contact');
      }
    } catch (err) { 
      console.error('Erreur ajout contact:', err);
      
      if (err.response?.status === 401) {
        setError(MESSAGES.errors.unauthorized);
      } else if (err.response?.status === 400) {
        setError(err.response.data?.message || 'Contact invalide ou déjà existant');
      } else if (err.code === 'ECONNABORTED') {
        setError(MESSAGES.errors.timeout);
      } else if (err.message === 'Network Error') {
        setError(MESSAGES.errors.networkError);
      } else {
        setError(err.response?.data?.message || err.message || 'Erreur inconnue');
      }
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
      <motion.form initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }} onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-6 w-80 shadow-xl border border-gray-700/50 space-y-4">
        <h3 className="text-white font-bold text-lg">Ajouter un contact</h3>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom complet" className="w-full p-2 rounded-md bg-gray-800 text-white border border-gray-700" disabled={loading} required />
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Téléphone (+225)" className="w-full p-2 rounded-md bg-gray-800 text-white border border-gray-700" disabled={loading} required />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={loading} className="px-3 py-1 rounded-md border border-gray-700 text-gray-400 hover:bg-gray-800">Annuler</button>
          <button type="submit" disabled={loading} className="px-3 py-1 rounded-md bg-orange-500 text-white font-medium">{loading ? '...' : 'Ajouter'}</button>
        </div>
      </motion.form>
    </motion.div>
  );
}