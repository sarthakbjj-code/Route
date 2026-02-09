/**
 * Apps Script backend for Route PWA — two-sheet architecture.
 *
 * Deploy as a Google Apps Script web app bound to a Google Spreadsheet
 * that contains two sheets: MASTER and DATA.
 *
 * MASTER columns (A→I):
 *   bp_number, customer_name, address, phone, is_active, notes, lat, lng, created_at
 *
 * DATA columns (A→V):
 *   server_id, local_id, bp_number, customer_name, agent_email, action_type,
 *   status, delivery_type, barcode, remarks, lat, lng, accuracy, sequence,
 *   customer_count, signature, written_at, received_at, synced, conflict_flag,
 *   source, extra_json
 */

/* ===================== doPost Router ===================== */

function doPost(e) {
  var content = parseRequest(e);
  if (!content) return jsonResponse({ error: 'invalid request' }, 400);

  var action = content.action;
  var payload = content.payload || {};

  switch (action) {
    case 'syncOfflineDeliveryBatch':
      return syncOfflineDeliveryBatch(payload);
    case 'getMasterSnapshot':
      return getMasterSnapshot();
    case 'completeDelivery':
      return completeDelivery(payload);
    default:
      return jsonResponse({ error: 'unknown action' }, 400);
  }
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'getMasterSnapshot') {
    return getMasterSnapshot();
  }
  return jsonResponse({ status: 'ok', message: 'Route API' });
}

/* ===================== Utilities ===================== */

function parseRequest(e) {
  try {
    if (e.postData && e.postData.type === 'application/json') {
      return JSON.parse(e.postData.contents);
    }
    return JSON.parse(e.parameter.data || '{}');
  } catch (err) {
    return null;
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ===================== syncOfflineDeliveryBatch ===================== */

function syncOfflineDeliveryBatch(payload) {
  var records = payload.records || [];
  if (!records.length) return jsonResponse({ results: [] });

  var ss = SpreadsheetApp.getActive();
  var dataSheet = ss.getSheetByName('DATA');

  // 1) Read existing local_id column once (column B)
  var lastRow = dataSheet.getLastRow();
  var existingSet = {};
  if (lastRow > 1) {
    var localIdRange = dataSheet.getRange(2, 2, lastRow - 1, 1); // skip header
    var existing = localIdRange.getValues().flat().filter(Boolean);
    existing.forEach(function (id) { existingSet[id] = true; });
  }

  // 2) Build rows to append
  var rowsToAppend = [];
  var results = [];
  var serverIds = [];

  records.forEach(function (rec) {
    var localId = rec.local_id;
    if (!localId) {
      results.push({ local_id: null, status: 'error', reason: 'missing_local_id' });
      return;
    }
    if (existingSet[localId]) {
      results.push({ local_id: localId, status: 'duplicate' });
      return;
    }

    var serverId = Utilities.getUuid();
    serverIds.push(serverId);

    var row = [
      serverId,
      localId,
      rec.bp_number || '',
      rec.customer_name || '',
      rec.agent_email || '',
      rec.action_type || '',
      rec.status || '',
      rec.delivery_type || '',
      rec.barcode || '',
      rec.remarks || '',
      rec.lat || '',
      rec.lng || '',
      rec.accuracy || '',
      rec.sequence || '',
      rec.customer_count || '',
      rec.signature || '',
      rec.written_at || '',
      new Date().toISOString(), // received_at
      'TRUE',                   // synced
      '',                       // conflict_flag
      rec.source || 'pwa',
      JSON.stringify(rec.extra || {})
    ];
    rowsToAppend.push(row);
    existingSet[localId] = true;
    results.push({ local_id: localId, status: 'queued', server_id: serverId });
  });

  // 3) Append all rows in a single setValues call
  if (rowsToAppend.length) {
    dataSheet.getRange(lastRow + 1, 1, rowsToAppend.length, rowsToAppend[0].length)
      .setValues(rowsToAppend);
  }

  return jsonResponse({ results: results });
}

/* ===================== getMasterSnapshot ===================== */

function getMasterSnapshot() {
  var ss = SpreadsheetApp.getActive();
  var masterSheet = ss.getSheetByName('MASTER');
  var lastRow = masterSheet.getLastRow();
  if (lastRow < 2) return jsonResponse({ rows: [] });

  var data = masterSheet.getRange(2, 1, lastRow - 1, 9).getValues(); // skip header
  var rows = data.map(function (r) {
    return {
      bp_number: r[0],
      customer_name: r[1],
      address: r[2],
      phone: r[3],
      is_active: r[4],
      notes: r[5],
      lat: r[6],
      lng: r[7],
      created_at: r[8]
    };
  });

  return jsonResponse({ rows: rows });
}

/* ===================== completeDelivery (single-record convenience) ===================== */

function completeDelivery(payload) {
  // Wraps a single record into a batch call for consistency
  return syncOfflineDeliveryBatch({ records: [payload] });
}
