// ============================================
// 📁 core/storage/StorageManager.js
// ============================================
export class StorageManager {
  static PREFIX = 'ibtp_';

  static get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(this.PREFIX + key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Erreur lecture localStorage: ${key}`, error);
      return defaultValue;
    }
  }

  static set(key, value) {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Erreur écriture localStorage: ${key}`, error);
      return false;
    }
  }

  static remove(key) {
    try {
      localStorage.removeItem(this.PREFIX + key);
      return true;
    } catch (error) {
      console.error(`Erreur suppression localStorage: ${key}`, error);
      return false;
    }
  }

  static getHistory(type) {
    return this.get(`history_${type}`, []);
  }

  static addToHistory(type, entry) {
    const history = this.getHistory(type);
    const newEntry = {
      ...entry,
      id: Date.now(),
      date: new Date().toISOString(),
    };
    const updated = [newEntry, ...history].slice(0, 50); // Garder max 50 entrées
    return this.set(`history_${type}`, updated);
  }

  static removeFromHistory(type, id) {
    const history = this.getHistory(type);
    const updated = history.filter(item => item.id !== id);
    return this.set(`history_${type}`, updated);
  }

  static clearHistory(type) {
    return this.remove(`history_${type}`);
  }

  static clearAll() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('Erreur effacement localStorage', error);
      return false;
    }
  }
}
