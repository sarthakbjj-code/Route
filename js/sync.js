/**
 * Sync module for Route PWA.
 *
 * Handles:
 *   - local_id generation
 *   - Batched sync to Apps Script backend
 *   - Exponential backoff on transient failures
 *   - MASTER snapshot refresh
 */

(function () {
  'use strict';

  /* ---- configuration ---- */
  // IMPORTANT: Replace with your deployed Apps Script web-app URL before use.
  // Sync calls will be skipped while this is empty.
  var API_URL = '';
  var BATCH_SIZE = 50;
  var MAX_RETRIES = 5;
  var BASE_DELAY_MS = 2000; // 2 seconds

  /* ---- local_id generation ---- */

  function generateLocalId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  }

  /* ---- helpers ---- */

  function postJSON(payload) {
    if (!API_URL) {
      return Promise.reject(new Error('API_URL not configured — set it in js/sync.js'));
    }
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  /* ---- batch sync ---- */

  /**
   * Attempt to sync all pending records.
   * Returns a promise that resolves with an array of per-record results.
   */
  function syncPendingRecords() {
    return RouteDB.getAllPending().then(function (records) {
      var unsynced = records.filter(function (r) { return !r.synced; });
      if (!unsynced.length) return [];

      // Split into batches of BATCH_SIZE
      var batches = [];
      for (var i = 0; i < unsynced.length; i += BATCH_SIZE) {
        batches.push(unsynced.slice(i, i + BATCH_SIZE));
      }

      return processBatches(batches, 0, []);
    });
  }

  function processBatches(batches, idx, allResults) {
    if (idx >= batches.length) return allResults;

    return sendBatchWithRetry(batches[idx], 0).then(function (batchResults) {
      return handleBatchResults(batchResults).then(function () {
        return processBatches(batches, idx + 1, allResults.concat(batchResults));
      });
    });
  }

  function sendBatchWithRetry(batch, attempt) {
    var payload = {
      action: 'syncOfflineDeliveryBatch',
      payload: { records: batch }
    };
    return postJSON(payload).catch(function (err) {
      if (attempt >= MAX_RETRIES) throw err;
      var wait = BASE_DELAY_MS * Math.pow(2, attempt);
      return delay(wait).then(function () {
        return sendBatchWithRetry(batch, attempt + 1);
      });
    });
  }

  function handleBatchResults(resp) {
    var results = (resp && resp.results) || [];
    var promises = results.map(function (r) {
      if (!r.local_id) return Promise.resolve();
      if (r.status === 'queued' || r.status === 'duplicate') {
        return RouteDB.deletePendingRecord(r.local_id);
      }
      // On error leave the record for later retry
      return Promise.resolve();
    });
    return Promise.all(promises);
  }

  /* ---- MASTER snapshot ---- */

  function refreshMasterSnapshot() {
    return postJSON({ action: 'getMasterSnapshot' }).then(function (resp) {
      var rows = (resp && resp.rows) || [];
      var masterRows = rows.map(function (r) {
        return {
          bp_number: r.bp_number || r[0] || '',
          customer_name: r.customer_name || r[1] || '',
          address: r.address || r[2] || '',
          phone: r.phone || r[3] || '',
          is_active: r.is_active !== undefined ? r.is_active : (r[4] || false),
          notes: r.notes || r[5] || '',
          lat: r.lat || r[6] || '',
          lng: r.lng || r[7] || '',
          created_at: r.created_at || r[8] || ''
        };
      });
      return RouteDB.saveMasterRows(masterRows).then(function () {
        return RouteDB.setMeta('last_master_update', new Date().toISOString());
      });
    });
  }

  /**
   * Refresh MASTER if it hasn't been refreshed in the last 24 hours.
   */
  function refreshMasterIfStale() {
    return RouteDB.getMeta('last_master_update').then(function (ts) {
      if (!ts) return refreshMasterSnapshot();
      var age = Date.now() - new Date(ts).getTime();
      var ONE_DAY = 24 * 60 * 60 * 1000;
      if (age > ONE_DAY) return refreshMasterSnapshot();
      return Promise.resolve();
    });
  }

  /* ---- public API ---- */

  window.RouteSync = {
    generateLocalId: generateLocalId,
    syncPendingRecords: syncPendingRecords,
    refreshMasterSnapshot: refreshMasterSnapshot,
    refreshMasterIfStale: refreshMasterIfStale,
    /** Allow runtime override of API URL */
    setApiUrl: function (url) { API_URL = url; },
    getApiUrl: function () { return API_URL; },
    BATCH_SIZE: BATCH_SIZE
  };
})();
