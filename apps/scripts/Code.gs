/**
 * ===== APRICITY — ACTIVATION KEYS BACKEND (Google Apps Script) =====
 *
 * Validates/redeems activation keys and tracks distinct devices (by device
 * id AND fingerprint). Creates and manages ONLY a "Keys" sheet/tab.
 *
 * Deploy as its OWN Web App with its OWN /exec URL, bound to a Sheet.
 *
 * ---- "Keys" sheet columns (auto-created on first run) ----
 *   A: Key
 *   B: Max Uses       number, or "inf" for unlimited
 *   C: Used Count     (script-maintained)
 *   D: Devices        ||| delimited list of device IDs
 *   E: Fingerprints   ||| delimited list, same order as Devices
 *   F: Status         "Active" / "Expired"
 *   G: Last Used      timestamp
 *   H: Created        timestamp (optional)
 *
 * NOTE: Devices and Fingerprints use ||| as delimiter instead of comma,
 *       because canvas fingerprints contain commas (base64 data URIs).
 *
 * ---- Request format (POST, x-www-form-urlencoded) ----
 *   key=<key>&did=<device id>&fp=<fingerprint>
 *
 * ---- Response ----
 *   { valid: true,  reason: 'redeemed' }            new device counted
 *   { valid: true,  reason: 'already_activated' }   device already used key
 *   { valid: false, reason: 'not_found' }
 *   { valid: false, reason: 'expired', message: '...' }
 */

var KEYS_SHEET_NAME = 'Keys';
var KEYS_HEADERS = ['Key', 'Max Uses', 'Used Count', 'Devices', 'Fingerprints', 'Status', 'Last Used', 'Created'];
var DELIM = '|||';

var COL_KEY = 1;
var COL_MAX_USES = 2;
var COL_USED_COUNT = 3;
var COL_DEVICES = 4;
var COL_FINGERPRINTS = 5;
var COL_STATUS = 6;
var COL_LAST_USED = 7;

var COLOR_EXPIRED = '#f4cccc';
var COLOR_ACTIVE = '#d9ead3';
var COLOR_UNLIMITED = '#ffffff';

// ===================== ENTRY POINTS =====================

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var p = (e && e.parameter) || {};
    var fp = String(p.fp || '').trim();
    var did = String(p.did || '').trim();
    var key = String(p.key || '').trim();

    // Validate fingerprint — reject garbage
    if (fp && !isValidFingerprint_(fp)) {
      Logger.log('Rejected invalid fp="' + fp + '" for did="' + did + '" key="' + key + '"');
      fp = '';
    }

    var result = validateKey_(key, did, fp);
    Logger.log('key="' + key + '" did="' + did + '" fp="' + fp + '" => ' + JSON.stringify(result));
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===================== FINGERPRINT VALIDATION =====================

/**
 * Fingerprints from the front-end look like "fp_abc123" (base-36 hash).
 * Reject anything that's clearly not a valid fingerprint.
 */
function isValidFingerprint_(fp) {
  if (!fp || fp === 'fp_unknown') return false;
  // Must start with "fp_" and be at least 5 chars total
  if (fp.indexOf('fp_') !== 0 || fp.length < 5) return false;
  // Must only contain safe characters
  if (/[^a-zA-Z0-9_]/.test(fp)) return false;
  return true;
}

// ===================== SHEET HELPERS =====================

function getKeysSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(KEYS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(KEYS_SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, KEYS_HEADERS.length).setValues([KEYS_HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  // Migrate old comma-delimited data to ||| delimiter on first run
  migrateCommaToPipe_(sheet);
  return sheet;
}

function findRowByKey_(sheet, key) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var values = sheet.getRange(2, COL_KEY, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === key) {
      return i + 2;
    }
  }
  return -1;
}

// ===================== DELIMITER HANDLING =====================
// Old data used commas, which breaks canvas fingerprints. Migrate to |||.

function parseList_(raw) {
  var s = String(raw || '').trim();
  if (s === '') return [];
  // If it contains |||, use that as delimiter
  if (s.indexOf(DELIM) !== -1) {
    return s.split(DELIM);
  }
  // Legacy comma-delimited: only 1 element = no commas in data, safe
  // Multiple elements with exactly the right count = probably not canvas fp
  return s.split(',');
}

function joinList_(arr) {
  return arr.join(DELIM);
}

function migrateCommaToPipe_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var devices = sheet.getRange(2, COL_DEVICES, lastRow - 1, 1).getValues();
  var fingerprints = sheet.getRange(2, COL_FINGERPRINTS, lastRow - 1, 1).getValues();
  var changed = false;

  for (var i = 0; i < devices.length; i++) {
    var d = String(devices[i][0] || '');
    var f = String(fingerprints[i][0] || '');
    // Only migrate if the data uses commas and has multiple entries
    if (d.indexOf(',') !== -1 && d.indexOf(DELIM) === -1) {
      sheet.getRange(i + 2, COL_DEVICES).setValue(d.replace(/,/g, DELIM));
      changed = true;
    }
    if (f.indexOf(',') !== -1 && f.indexOf(DELIM) === -1) {
      sheet.getRange(i + 2, COL_FINGERPRINTS).setValue(f.replace(/,/g, DELIM));
      changed = true;
    }
  }
  if (changed) {
    Logger.log('Migrated comma-delimited data to ||| delimiter');
  }
}

// ===================== KEY VALIDATION / USAGE TRACKING =====================

function parseMaxUses_(raw) {
  var s = String(raw).trim().toLowerCase();
  if (s === '' || s === 'inf' || s === 'infinite' || s === 'unlimited') return Infinity;
  var n = parseInt(s, 10);
  return isNaN(n) ? Infinity : n;
}

/**
 * Validates + (if applicable) redeems a key for a given device.
 */
function validateKey_(key, did, fp) {
  if (!key) return { valid: false, reason: 'not_found', message: 'Invalid activation key.' };

  var sheet = getKeysSheet_();
  var row = findRowByKey_(sheet, key);
  if (row === -1) {
    return { valid: false, reason: 'not_found', message: 'Invalid activation key.' };
  }

  var vals = sheet.getRange(row, 1, 1, KEYS_HEADERS.length).getValues()[0];
  var maxUses = parseMaxUses_(vals[COL_MAX_USES - 1]);
  var devices = parseList_(vals[COL_DEVICES - 1]);
  var fingerprints = parseList_(vals[COL_FINGERPRINTS - 1]);

  // Pad fingerprints array to match devices length if sheet is stale
  while (fingerprints.length < devices.length) {
    fingerprints.push('');
  }

  var existingIndex = did ? devices.indexOf(did) : -1;

  // Device already redeemed — keep fingerprint fresh, don't burn a use
  if (existingIndex !== -1) {
    // Only update fingerprint if we got a valid one
    if (fp && fp !== fingerprints[existingIndex]) {
      fingerprints[existingIndex] = fp;
      sheet.getRange(row, COL_FINGERPRINTS).setValue(joinList_(fingerprints));
      Logger.log('Updated fp for did="' + did + '" key="' + key + '" fp="' + fp + '"');
    }
    sheet.getRange(row, COL_LAST_USED).setValue(new Date());
    return { valid: true, reason: 'already_activated' };
  }

  // Brand-new device
  if (devices.length >= maxUses) {
    paintKeyRow_(sheet, row, 'Expired');
    return { valid: false, reason: 'expired', message: 'This activation key has reached its device limit.' };
  }

  if (did) devices.push(did);
  fingerprints.push(fp || '');
  var newCount = devices.length;
  var status = (newCount >= maxUses) ? 'Expired' : 'Active';

  sheet.getRange(row, COL_USED_COUNT).setValue(newCount);
  sheet.getRange(row, COL_DEVICES).setValue(joinList_(devices));
  sheet.getRange(row, COL_FINGERPRINTS).setValue(joinList_(fingerprints));
  sheet.getRange(row, COL_LAST_USED).setValue(new Date());
  paintKeyRow_(sheet, row, status);

  Logger.log('New device did="' + did + '" fp="' + fp + '" key="' + key + '" count=' + newCount);
  return { valid: true, reason: 'redeemed' };
}

function paintKeyRow_(sheet, row, status) {
  sheet.getRange(row, COL_STATUS).setValue(status);
  var maxUsesRaw = sheet.getRange(row, COL_MAX_USES).getValue();
  var unlimited = parseMaxUses_(maxUsesRaw) === Infinity;
  var color = unlimited ? COLOR_UNLIMITED : (status === 'Expired' ? COLOR_EXPIRED : COLOR_ACTIVE);
  sheet.getRange(row, 1, 1, KEYS_HEADERS.length).setBackground(color);
}

/**
 * Re-check every key row and repaint Active/Expired colors.
 */
function repaintAllKeys() {
  var sheet = getKeysSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var data = sheet.getRange(2, 1, lastRow - 1, KEYS_HEADERS.length).getValues();
  for (var i = 0; i < data.length; i++) {
    var row = i + 2;
    var maxUses = parseMaxUses_(data[i][COL_MAX_USES - 1]);
    var devices = parseList_(data[i][COL_DEVICES - 1]);
    var count = devices.length;
    var status = (maxUses !== Infinity && count >= maxUses) ? 'Expired' : 'Active';
    sheet.getRange(row, COL_USED_COUNT).setValue(count);
    paintKeyRow_(sheet, row, status);
  }
}

// ===================== BACKFILL MISSING FINGERPRINTS =====================

/**
 * Scans all keys and reports how many devices have empty fingerprints.
 * Useful for diagnosing collection issues.
 */
function diagnoseFingerprints() {
  var sheet = getKeysSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 'No keys found.';

  var data = sheet.getRange(2, 1, lastRow - 1, KEYS_HEADERS.length).getValues();
  var totalDevices = 0;
  var totalWithFp = 0;
  var totalEmpty = 0;

  for (var i = 0; i < data.length; i++) {
    var devices = parseList_(data[i][COL_DEVICES - 1]);
    var fingerprints = parseList_(data[i][COL_FINGERPRINTS - 1]);
    while (fingerprints.length < devices.length) fingerprints.push('');

    for (var j = 0; j < devices.length; j++) {
      totalDevices++;
      if (fingerprints[j] && fingerprints[j] !== 'fp_unknown') {
        totalWithFp++;
      } else {
        totalEmpty++;
      }
    }
  }

  var msg = 'Total devices: ' + totalDevices
    + '\nWith fingerprint: ' + totalWithFp
    + '\nMissing/invalid: ' + totalEmpty
    + '\nCoverage: ' + (totalDevices > 0 ? Math.round(totalWithFp / totalDevices * 100) : 0) + '%';
  Logger.log(msg);
  SpreadsheetApp.getUi().alert('Fingerprint Diagnosis', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  return msg;
}

// ===================== ADMIN MENU =====================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Apricity Keys')
    .addItem('Initialize Keys sheet', 'initializeKeysSheet')
    .addItem('Repaint key statuses', 'repaintAllKeys')
    .addItem('Diagnose fingerprints', 'diagnoseFingerprints')
    .addItem('View usage for a key\u2026', 'showKeyUsageDialog')
    .addToUi();
}

function initializeKeysSheet() {
  getKeysSheet_();
  SpreadsheetApp.getUi().alert('The "Keys" sheet is ready.');
}

// ===================== PER-KEY USAGE VIEWER =====================

function getAllKeyNames() {
  var sheet = getKeysSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, COL_KEY, lastRow - 1, 1).getValues()
    .map(function (r) { return String(r[0]).trim(); })
    .filter(function (k) { return k.length > 0; });
}

function showKeyUsageDialog() {
  var keys = getAllKeyNames();
  var optionsHtml = keys.length
    ? keys.map(function (k) { return '<option value="' + escapeHtml_(k) + '">' + escapeHtml_(k) + '</option>'; }).join('')
    : '<option value="" disabled>No keys found</option>';

  var html = ''
    + '<style>'
    + '  body { font-family: Arial, sans-serif; padding: 4px 8px; }'
    + '  select, button { font-size: 14px; padding: 6px 8px; margin-top: 6px; width: 100%; box-sizing: border-box; }'
    + '  button { background: #4285f4; color: #fff; border: none; border-radius: 4px; cursor: pointer; margin-top: 12px; }'
    + '  button:disabled { background: #aaa; cursor: default; }'
    + '  #status { margin-top: 10px; font-size: 12px; color: #555; }'
    + '</style>'
    + '<div>Select a key:</div>'
    + '<select id="keySelect">' + optionsHtml + '</select>'
    + '<button id="go"' + (keys.length ? '' : ' disabled') + '>Show usage</button>'
    + '<div id="status"></div>'
    + '<script>'
    + '  document.getElementById("go").addEventListener("click", function () {'
    + '    var key = document.getElementById("keySelect").value;'
    + '    if (!key) return;'
    + '    var btn = this; btn.disabled = true;'
    + '    document.getElementById("status").textContent = "Building sheet...";'
    + '    google.script.run'
    + '      .withSuccessHandler(function (sheetName) {'
    + '        document.getElementById("status").textContent = "Done — see the \\"" + sheetName + "\\" tab.";'
    + '        btn.disabled = false;'
    + '      })'
    + '      .withFailureHandler(function (err) {'
    + '        document.getElementById("status").textContent = "Error: " + err.message;'
    + '        btn.disabled = false;'
    + '      })'
    + '      .generateKeyUsageSheet(key);'
    + '  });'
    + '</script>';

  var output = HtmlService.createHtmlOutput(html).setWidth(360).setHeight(200);
  SpreadsheetApp.getUi().showModalDialog(output, 'Apricity Keys — View Usage');
}

function escapeHtml_(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateKeyUsageSheet(key) {
  key = String(key).trim();
  var keysSheet = getKeysSheet_();
  var row = findRowByKey_(keysSheet, key);
  if (row === -1) throw new Error('Key not found: ' + key);

  var vals = keysSheet.getRange(row, 1, 1, KEYS_HEADERS.length).getValues()[0];
  var maxUses = vals[COL_MAX_USES - 1];
  var devices = parseList_(vals[COL_DEVICES - 1]);
  var fingerprints = parseList_(vals[COL_FINGERPRINTS - 1]);
  while (fingerprints.length < devices.length) fingerprints.push('');
  var status = vals[COL_STATUS - 1];

  var sheetName = ('Usage - ' + key).slice(0, 100);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var usageSheet = ss.getSheetByName(sheetName);
  if (usageSheet) {
    usageSheet.clear();
  } else {
    usageSheet = ss.insertSheet(sheetName);
  }

  usageSheet.getRange(1, 1, 1, 2).setValues([['Key:', key]]).setFontWeight('bold');
  usageSheet.getRange(2, 1, 1, 2).setValues([['Max Uses:', maxUses]]);
  usageSheet.getRange(3, 1, 1, 2).setValues([['Status:', status]]);
  usageSheet.getRange(4, 1, 1, 2).setValues([['Total Devices:', devices.length]]);

  // Count valid fingerprints
  var withFp = fingerprints.filter(function(f) { return f && f !== 'fp_unknown'; }).length;
  usageSheet.getRange(5, 1, 1, 2).setValues([['With Fingerprint:', withFp + ' / ' + devices.length]]);

  var headerRow = 7;
  usageSheet.getRange(headerRow, 1, 1, 3).setValues([['Device ID', 'Fingerprint', 'Has FP?']]).setFontWeight('bold');
  usageSheet.setFrozenRows(headerRow);

  if (devices.length > 0) {
    var rows = devices.map(function (d, i) {
      var fp = fingerprints[i] || '';
      var hasFp = (fp && fp !== 'fp_unknown') ? 'Yes' : 'No';
      return [d, fp, hasFp];
    });
    usageSheet.getRange(headerRow + 1, 1, rows.length, 3).setValues(rows);

    // Highlight rows without fingerprints in red
    for (var i = 0; i < rows.length; i++) {
      if (rows[i][2] === 'No') {
        usageSheet.getRange(headerRow + 1 + i, 1, 1, 3).setBackground(COLOR_EXPIRED);
      }
    }
  }

  usageSheet.autoResizeColumns(1, 3);
  ss.setActiveSheet(usageSheet);
  return sheetName;
}
