const DB_NAME = 'AegisQuantumDB';
const DB_VERSION = 1;

let dbInstance = null;

export function initDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Store signals
      if (!db.objectStoreNames.contains('signals')) {
        db.createObjectStore('signals', { keyPath: 'dbId', autoIncrement: true });
      }

      // Store active trades
      if (!db.objectStoreNames.contains('activeTrades')) {
        db.createObjectStore('activeTrades', { keyPath: 'id' });
      }

      // Store closed trades
      if (!db.objectStoreNames.contains('closedTrades')) {
        db.createObjectStore('closedTrades', { keyPath: 'id' });
      }

      // Store settings (like capital)
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
}

export function getSignals() {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('signals', 'readonly');
      const store = tx.objectStore('signals');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  });
}

export function saveSignal(signal) {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('signals', 'readwrite');
      const store = tx.objectStore('signals');
      const request = store.add(signal);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

export function getActiveTrades() {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('activeTrades', 'readonly');
      const store = tx.objectStore('activeTrades');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  });
}

export function addActiveTrade(trade) {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('activeTrades', 'readwrite');
      const store = tx.objectStore('activeTrades');
      const request = store.put(trade);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

export function deleteActiveTrade(tradeId) {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('activeTrades', 'readwrite');
      const store = tx.objectStore('activeTrades');
      const request = store.delete(tradeId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

export function getClosedTrades() {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('closedTrades', 'readonly');
      const store = tx.objectStore('closedTrades');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  });
}

export function addClosedTrade(trade) {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('closedTrades', 'readwrite');
      const store = tx.objectStore('closedTrades');
      const request = store.put(trade);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

export function getSetting(key) {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ? request.result.value : null);
      request.onerror = () => reject(request.error);
    });
  });
}

export function saveSetting(key, value) {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const request = store.put({ key, value });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  });
}

export function clearAllData() {
  return initDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['signals', 'activeTrades', 'closedTrades', 'settings'], 'readwrite');
      tx.objectStore('signals').clear();
      tx.objectStore('activeTrades').clear();
      tx.objectStore('closedTrades').clear();
      tx.objectStore('settings').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  });
}
