/**
 * IndexedDB Local-First Storage Module for TrekkingPlanner
 * High-performance, zero-loss persistent client-side storage.
 */

import { validateTrek, createNewTrek } from './models/trek-schema.js';

const DB_NAME = 'TrekkingPlannerDB';
const DB_VERSION = 1;
const STORE_TREKS = 'treks';
const STORE_SETTINGS = 'settings';

let dbInstance = null;
let saveTimeout = null;

/**
 * Opens or initializes the IndexedDB database.
 * Also requests persistent storage permissions from the browser.
 * @returns {Promise<IDBDatabase>}
 */
export async function initDB() {
  if (dbInstance) return dbInstance;

  // Request persistent storage if supported (iOS Safari, Chrome, etc.)
  if (navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      console.log(`[Storage] Persistent storage granted: ${isPersisted}`);
    } catch (err) {
      console.warn('[Storage] Could not request persistent storage:', err);
    }
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_TREKS)) {
        db.createObjectStore(STORE_TREKS, { keyPath: 'meta.id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };

    request.onsuccess = async event => {
      dbInstance = event.target.result;
      
      // Check if seeded on first run; if not, seed with default Garda 2026
      try {
        const tx = dbInstance.transaction(STORE_SETTINGS, 'readonly');
        const settingsStore = tx.objectStore(STORE_SETTINGS);
        const checkReq = settingsStore.get('hasInitialized');
        checkReq.onsuccess = async () => {
          if (!checkReq.result) {
            console.log('[Storage] First run, seeding with default Garda 2026...');
            await resetToGarda2026();
            const tx2 = dbInstance.transaction(STORE_SETTINGS, 'readwrite');
            tx2.objectStore(STORE_SETTINGS).put({ key: 'hasInitialized', value: true });
          }
        };
      } catch (err) {
        console.warn('[Storage] Error during initial seed check:', err);
      }
      
      resolve(dbInstance);
    };

    request.onerror = event => {
      console.error('[Storage] IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Retrieves the currently active Trek ID from settings.
 * @returns {Promise<string>}
 */
export async function getActiveTrekId() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readonly');
    const store = tx.objectStore(STORE_SETTINGS);
    const req = store.get('activeTrekId');

    req.onsuccess = () => {
      resolve(req.result?.value || 'garda-2026');
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Sets the active Trek ID in settings.
 * @param {string} id 
 * @returns {Promise<void>}
 */
export async function setActiveTrekId(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SETTINGS, 'readwrite');
    const store = tx.objectStore(STORE_SETTINGS);
    const req = store.put({ key: 'activeTrekId', value: id });

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves the full active Trek object from IndexedDB.
 * @returns {Promise<object>}
 */
export async function getActiveTrek() {
  const db = await initDB();
  const activeId = await getActiveTrekId();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TREKS, 'readonly');
    const store = tx.objectStore(STORE_TREKS);
    const req = store.get(activeId);

    req.onsuccess = async () => {
      if (req.result) {
        resolve(req.result);
      } else {
        // Fallback: get first available trek or seed default
        const all = await getAllTreks();
        if (all.length > 0) {
          const firstTrek = await getTrekById(all[0].id);
          await setActiveTrekId(firstTrek.meta.id);
          resolve(firstTrek);
        } else {
          const defaultTrek = await resetToGarda2026();
          resolve(defaultTrek);
        }
      }
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves a trek by its ID.
 * @param {string} id 
 * @returns {Promise<object>}
 */
export async function getTrekById(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TREKS, 'readonly');
    const store = tx.objectStore(STORE_TREKS);
    const req = store.get(id);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Saves a trek into IndexedDB.
 * Emits a global window event 'trek-saved'.
 * @param {object} trek 
 * @returns {Promise<void>}
 */
export async function saveTrek(trek) {
  validateTrek(trek);
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TREKS, 'readwrite');
    const store = tx.objectStore(STORE_TREKS);
    const req = store.put(trek);

    req.onsuccess = () => {
      window.dispatchEvent(new CustomEvent('trek-saved', { detail: { id: trek.meta.id } }));
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Saves active trek with debouncing (useful for rapid user keystrokes / toggles).
 * @param {object} trek 
 * @param {number} delayMs 
 */
export function debouncedSave(trek, delayMs = 250) {
  window.dispatchEvent(new CustomEvent('trek-saving'));
  if (saveTimeout) clearTimeout(saveTimeout);
  
  saveTimeout = setTimeout(async () => {
    try {
      await saveTrek(trek);
    } catch (err) {
      console.error('[Storage] Debounced save failed:', err);
      window.dispatchEvent(new CustomEvent('trek-save-error', { detail: err }));
    }
  }, delayMs);
}

/**
 * Retrieves all stored treks (metadata summary).
 * @returns {Promise<Array>}
 */
export async function getAllTreks() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TREKS, 'readonly');
    const store = tx.objectStore(STORE_TREKS);
    const req = store.getAll();

    req.onsuccess = () => {
      const summaries = (req.result || []).map(t => ({
        id: t.meta?.id,
        title: t.meta?.title || 'Senza titolo',
        startDate: t.meta?.startDate,
        endDate: t.meta?.endDate,
        stagesCount: Array.isArray(t.stages) ? t.stages.length : 0
      }));
      resolve(summaries);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Deletes a trek by ID.
 * @param {string} id 
 * @returns {Promise<void>}
 */
export async function deleteTrek(id) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TREKS, 'readwrite');
    const store = tx.objectStore(STORE_TREKS);
    const req = store.delete(id);

    req.onsuccess = async () => {
      const activeId = await getActiveTrekId();
      if (activeId === id) {
        const remaining = await getAllTreks();
        if (remaining.length > 0) {
          await setActiveTrekId(remaining[0].id);
        } else {
          const newBlank = createNewTrek({ title: 'Nuovo Trekking' });
          await saveTrek(newBlank);
          await setActiveTrekId(newBlank.meta.id);
        }
      }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Resets or reloads the default Garda 2026 trek from default-trek.json.
 * @returns {Promise<object>}
 */
export async function resetToGarda2026() {
  try {
    const response = await fetch('default-trek.json');
    if (!response.ok) {
      throw new Error(`Impossibile caricare default-trek.json: HTTP ${response.status}`);
    }
    const defaultTrek = await response.json();
    await saveTrek(defaultTrek);
    await setActiveTrekId(defaultTrek.meta.id);
    return defaultTrek;
  } catch (err) {
    console.error('[Storage] Error loading default-trek.json:', err);
    throw err;
  }
}

/**
 * Triggers a client-side download of the trek as a formatted .json file.
 * Compatible with iOS Files, iCloud Drive, Android, and Desktop.
 * @param {object} trek 
 */
export function exportTrekJSON(trek) {
  validateTrek(trek);
  const jsonString = JSON.stringify(trek, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  const filename = `${trek.meta.id || 'trek'}.trekking.json`;
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Imports a trek from a JSON string or File, saves it to IndexedDB, and sets it as active.
 * @param {string} jsonString 
 * @returns {Promise<object>}
 */
export async function importTrekJSON(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    throw new Error('Il file caricato non è un JSON valido: ' + e.message);
  }

  validateTrek(parsed);
  await saveTrek(parsed);
  await setActiveTrekId(parsed.meta.id);
  return parsed;
}

/**
 * Checks storage persistence and quota info.
 * @returns {Promise<object>}
 */
export async function getStorageStatus() {
  let persisted = false;
  let usage = 0;
  let quota = 0;

  if (navigator.storage && navigator.storage.persisted) {
    persisted = await navigator.storage.persisted();
  }
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    usage = estimate.usage || 0;
    quota = estimate.quota || 0;
  }

  return {
    persisted,
    usageBytes: usage,
    quotaBytes: quota,
    usageMb: (usage / (1024 * 1024)).toFixed(2),
    quotaMb: (quota / (1024 * 1024)).toFixed(0)
  };
}

