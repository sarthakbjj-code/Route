/**
 * IndexedDB module for Route PWA.
 *
 * Stores:
 *   pending  – delivery records awaiting sync (keyed by local_id)
 *   master   – cached MASTER rows (keyed by bp_number)
 *   meta     – small key/value pairs (e.g. last_master_update)
 */

const DB_NAME = 'route_pwa';
const DB_VERSION = 1;

function openDB() {
  return new Promise(function (resolve, reject) {
    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function (e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains('pending')) {
        db.createObjectStore('pending', { keyPath: 'local_id' });
      }
      if (!db.objectStoreNames.contains('master')) {
        db.createObjectStore('master', { keyPath: 'bp_number' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
}

/* ---------- pending store helpers ---------- */

function savePendingRecord(record) {
  return openDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction('pending', 'readwrite');
      tx.objectStore('pending').put(record);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  });
}

function getAllPending() {
  return openDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction('pending', 'readonly');
      var req = tx.objectStore('pending').getAll();
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  });
}

function deletePendingRecord(localId) {
  return openDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction('pending', 'readwrite');
      tx.objectStore('pending').delete(localId);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  });
}

function markPendingSynced(localId) {
  return openDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction('pending', 'readwrite');
      var store = tx.objectStore('pending');
      var getReq = store.get(localId);
      getReq.onsuccess = function () {
        var rec = getReq.result;
        if (rec) {
          rec.synced = true;
          store.put(rec);
        }
        tx.oncomplete = function () { resolve(); };
      };
      tx.onerror = function () { reject(tx.error); };
    });
  });
}

/* ---------- master store helpers ---------- */

function saveMasterRows(rows) {
  return openDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction('master', 'readwrite');
      var store = tx.objectStore('master');
      rows.forEach(function (row) { store.put(row); });
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  });
}

function getMasterByBP(bpNumber) {
  return openDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction('master', 'readonly');
      var req = tx.objectStore('master').get(bpNumber);
      req.onsuccess = function () { resolve(req.result || null); };
      req.onerror = function () { reject(req.error); };
    });
  });
}

function getAllMaster() {
  return openDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction('master', 'readonly');
      var req = tx.objectStore('master').getAll();
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  });
}

/* ---------- meta store helpers ---------- */

function setMeta(key, value) {
  return openDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction('meta', 'readwrite');
      tx.objectStore('meta').put({ key: key, value: value });
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  });
}

function getMeta(key) {
  return openDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction('meta', 'readonly');
      var req = tx.objectStore('meta').get(key);
      req.onsuccess = function () {
        resolve(req.result ? req.result.value : null);
      };
      req.onerror = function () { reject(req.error); };
    });
  });
}

// Expose for other modules
window.RouteDB = {
  openDB: openDB,
  savePendingRecord: savePendingRecord,
  getAllPending: getAllPending,
  deletePendingRecord: deletePendingRecord,
  markPendingSynced: markPendingSynced,
  saveMasterRows: saveMasterRows,
  getMasterByBP: getMasterByBP,
  getAllMaster: getAllMaster,
  setMeta: setMeta,
  getMeta: getMeta
};
