/**
 * Main application module for Route PWA.
 *
 * Wires up UI, delivery form, MASTER lookup, and sync triggers.
 */

(function () {
  'use strict';

  /* ---- DOM references (set after DOMContentLoaded) ---- */
  var formEl, bpInput, nameDisplay, statusEl, pendingCountEl, syncBtn;

  /* ---- initialisation ---- */

  function init() {
    formEl = document.getElementById('delivery-form');
    bpInput = document.getElementById('bp_number');
    nameDisplay = document.getElementById('customer_name_display');
    statusEl = document.getElementById('sync-status');
    pendingCountEl = document.getElementById('pending-count');
    syncBtn = document.getElementById('sync-btn');

    if (formEl) formEl.addEventListener('submit', onFormSubmit);
    if (bpInput) bpInput.addEventListener('change', onBPChange);
    if (syncBtn) syncBtn.addEventListener('click', onSyncClick);

    updatePendingCount();

    // Refresh MASTER cache if stale
    RouteSync.refreshMasterIfStale().catch(function () {
      /* offline — use cached data */
    });

    // Auto-sync when coming online
    window.addEventListener('online', function () {
      setStatus('Online — syncing…');
      triggerSync();
    });

    window.addEventListener('offline', function () {
      setStatus('Offline — records saved locally');
    });

    setStatus(navigator.onLine ? 'Online' : 'Offline');
  }

  /* ---- BP lookup ---- */

  function onBPChange() {
    var bp = (bpInput.value || '').trim();
    if (!bp) { nameDisplay.textContent = ''; return; }
    RouteDB.getMasterByBP(bp).then(function (row) {
      nameDisplay.textContent = row ? row.customer_name : '(not found)';
    });
  }

  /* ---- form submission ---- */

  function onFormSubmit(e) {
    e.preventDefault();
    var data = new FormData(formEl);

    var record = {
      local_id: RouteSync.generateLocalId(),
      bp_number: (data.get('bp_number') || '').trim(),
      customer_name: nameDisplay ? nameDisplay.textContent : '',
      agent_email: (data.get('agent_email') || '').trim(),
      action_type: data.get('action_type') || 'complete_delivery',
      status: data.get('status') || 'delivered',
      delivery_type: data.get('delivery_type') || '',
      barcode: (data.get('barcode') || '').trim(),
      remarks: (data.get('remarks') || '').trim(),
      lat: '',
      lng: '',
      accuracy: '',
      sequence: '',
      customer_count: '',
      signature: '',
      written_at: new Date().toISOString(),
      synced: false,
      source: 'pwa',
      extra: {}
    };

    // Attempt to capture GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          record.lat = pos.coords.latitude;
          record.lng = pos.coords.longitude;
          record.accuracy = pos.coords.accuracy;
          saveAndSync(record);
        },
        function () { saveAndSync(record); },
        { timeout: 5000, enableHighAccuracy: true }
      );
    } else {
      saveAndSync(record);
    }
  }

  function saveAndSync(record) {
    RouteDB.savePendingRecord(record).then(function () {
      setStatus('Record saved locally');
      updatePendingCount();
      formEl.reset();
      nameDisplay.textContent = '';

      if (navigator.onLine) {
        triggerSync();
      }
    });
  }

  /* ---- sync ---- */

  function onSyncClick() {
    if (!navigator.onLine) {
      setStatus('Cannot sync — you are offline');
      return;
    }
    triggerSync();
  }

  function triggerSync() {
    setStatus('Syncing…');
    RouteSync.syncPendingRecords()
      .then(function (results) {
        var ok = results.filter(function (r) {
          return r.status === 'queued' || r.status === 'duplicate';
        }).length;
        setStatus('Synced ' + ok + ' record(s)');
        updatePendingCount();
      })
      .catch(function (err) {
        setStatus('Sync error: ' + err.message);
      });
  }

  /* ---- UI helpers ---- */

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function updatePendingCount() {
    RouteDB.getAllPending().then(function (records) {
      var count = records.filter(function (r) { return !r.synced; }).length;
      if (pendingCountEl) pendingCountEl.textContent = count;
    });
  }

  /* ---- kick off ---- */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
