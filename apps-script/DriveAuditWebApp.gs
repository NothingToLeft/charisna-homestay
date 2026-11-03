/**
 * DriveAuditWebApp.gs
 * Web App Google Apps Script untuk menerima rekapan bulanan dari
 * aplikasi Charisna Kost lalu menyimpannya ke Google Drive:
 *   Drive / <nama root> / <Aset> / <Tahun> / <Tahun-Bulan> / Rekap-<Tahun-Bulan>.xlsx
 *                                                / Audit-<Tahun-Bulan>.png
 *
 * Cara deploy:
 *   1. Buka https://script.google.com → "Proyek baru".
 *   2. Tempel seluruh isi file ini ke editor (Code.gs).
 *   3. Deploy → Deploy baru → "Web app".
 *      - Execute as: "Me" (akun Google yang punya Drive tujuan).
 *      - Who has access: "Anyone with link" (aplikasi memanggil via fetch).
 *   4. Salin URL Web App → tempel di Pengaturan → "URL Google Apps Script".
 *
 * Set Script Property FIREBASE_API_KEY to the project's Firebase Web API key.
 * Every upload requires a valid Firebase owner ID token. Never log tokens.
 */

var ROOT_FOLDER_NAME = 'Rekap Bulanan';

function doPost(e) {
  try {
    if (!e || !e.postData || e.postData.contents.length > 6000000) throw new Error('Payload tidak valid atau terlalu besar');
    var payload = JSON.parse(e.postData.contents);
    requireAuditOwner(payload.idToken);
    if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(payload.monthKey || '') || String(payload.year) !== payload.monthKey.slice(0, 4)) throw new Error('Bulan rekap tidak valid');
    var root = charisnaRoot();
    try { migrateLegacyLayout(root); } catch (migErr) { console.error('Migrasi layout lama gagal: ' + migErr); }
    var folder = ensureFolderChain(payload);
    var monthKey = payload.monthKey || 'unknown';
    var label = monthKey + '-' + (payload.monthLabel || '');

    // 1) Excel (.xlsx) dari Spreadsheet
    var ss = SpreadsheetApp.create('Rekap ' + (payload.monthLabel || monthKey));
    DriveApp.getFileById(ss.getId()).moveTo(getOrCreateFolder(getOrCreateFolder(charisnaRoot(), 'Sistem'), 'Proses Rekap'));
    var sheets = payload.sheets || {};
    Object.keys(sheets).forEach(function (name) {
      var rows = sheets[name];
      if (!rows || !rows.length) return;
      var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
      var values = rows.map(function (r) {
        return Object.keys(r).map(function (k) { return r[k]; });
      });
      var headers = Object.keys(rows[0]);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(2, 1, values.length, headers.length).setValues(values);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
      sheet.autoResizeColumns(1, headers.length);
    });
    // sheet ringkasan
    var sum = payload.summary || {};
    var sumSheet = ss.getSheetByName('Ringkasan');
    if (sumSheet) {
      var sumRows = [
        ['Kost', payload.app],
        ['Bulan', label],
        ['Dibuat', payload.generatedAt],
        ['Penghuni', sum.penghuni],
        ['KTP Verified', sum.ktpVerified],
        ['Pendapatan', sum.income],
        ['Pengeluaran', sum.expense],
        ['Laba Bersih', sum.net],
        ['Biaya Perbaikan', sum.maintenanceCost],
        ['Pemakaian Listrik (kWh)', sum.elecUsage],
        ['Biaya Listrik', sum.elecCost],
        ['Pemakaian Air (m³)', sum.waterUsage],
        ['Biaya Air', sum.waterCost],
        ['Stok Total', sum.stockTotal],
        ['Stok Menipis', sum.stockLow],
        ['Kontrak Berakhir ≤30 hari', sum.kontrakAkanBerakhir]
      ];
      sumSheet.getRange(1, 1, sumRows.length, 2).setValues(sumRows);
      sumSheet.getRange(1, 1, sumRows.length, 1).setFontWeight('bold');
      sumSheet.autoResizeColumns(1, 2);
    }
    // hapus sheet default
    var def = ss.getSheetByName('Sheet1');
    if (def && ss.getSheets().length > 1) ss.deleteSheet(def);

    SpreadsheetApp.flush();
    var exportResponse = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + encodeURIComponent(ss.getId()) + '/export?format=xlsx', {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true
    });
    if (exportResponse.getResponseCode() !== 200) throw new Error('Ekspor XLSX gagal: ' + exportResponse.getResponseCode());
    var bytes = exportResponse.getBlob();
    folder.createFile(bytes.setName('Rekap-' + monthKey + '.xlsx'));
    DriveApp.getFileById(ss.getId()).setTrashed(true); // bersihkan spreadsheet kerja

    // 2) PNG kartu audit
    if (payload.pngBase64) {
      var b64 = payload.pngBase64.split(',')[1] || payload.pngBase64;
      var blob = Utilities.newBlob(Utilities.base64Decode(b64), 'image/png', 'Audit-' + monthKey + '.png');
      folder.createFile(blob);
    }

    return ContentService.createTextOutput(JSON.stringify({
      ok: true,
      path: folder.getParents().next().getName() + '/' + folder.getName()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: String(err)
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function requireAuditOwner(idToken) {
  if (typeof idToken !== 'string' || idToken.length < 100 || idToken.length > 10000) throw new Error('Login owner diperlukan');
  var apiKey = PropertiesService.getScriptProperties().getProperty('FIREBASE_API_KEY');
  if (!apiKey) throw new Error('Konfigurasi autentikasi server belum lengkap');
  var response = UrlFetchApp.fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(apiKey), {
    method: 'post', contentType: 'application/json', payload: JSON.stringify({ idToken: idToken }), muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) throw new Error('Sesi owner tidak valid');
  var account = JSON.parse(response.getContentText()).users;
  if (!account || account.length !== 1 || account[0].disabled || account[0].email !== 'charisna.homestay@gmail.com') throw new Error('Akses hanya untuk owner');
}

function ensureFolderChain(payload) {
  var year = String(payload.year || '');
  var assetName = String(payload.assetName || 'Gabungan Semua Properti').trim().replace(/[\\/:*?"<>|\r\n]/g, '-').slice(0, 100);
  if (!assetName || assetName === '.' || assetName === '..') throw new Error('Nama properti tidak valid');
  var folder = getOrCreateFolder(charisnaRoot(), assetName);
  if (year) folder = getOrCreateFolder(folder, year);
  return getOrCreateFolder(folder, payload.monthKey || 'bulan');
}

// One-time, idempotent migration for the legacy layout
//   CHARISNA KOST/Rekap Bulanan/<asset>/<year>/<month>
// into
//   CHARISNA KOST/<asset>/<year>/<month>.
// Preserves file IDs and never overwrites or duplicates files. An empty
// legacy folder simply has nothing left to move, so re-running is safe.
function migrateLegacyLayout(root) {
  var it = root.getFoldersByName(ROOT_FOLDER_NAME);
  while (it.hasNext()) {
    var legacy = it.next();
    var assets = legacy.getFolders();
    while (assets.hasNext()) {
      var asset = assets.next();
      if (/^20\d{2}$/.test(asset.getName())) {
        var combined = getOrCreateFolder(root, 'Gabungan Semua Properti');
        migrateFolderTree(asset, getOrCreateFolder(combined, asset.getName()));
      } else {
        migrateFolderTree(asset, getOrCreateFolder(root, asset.getName()));
      }
    }
    migrateFilesInto(legacy, getOrCreateFolder(getOrCreateFolder(root, 'Sistem'), 'Pemulihan'));
  }
}

function migrateFolderTree(src, dst) {
  var groups = src.getFolders();
  while (groups.hasNext()) {
    var group = groups.next();
    var groupDst = getOrCreateFolder(dst, group.getName());
    migrateFolderTree(group, groupDst);
  }
  migrateFilesInto(src, dst);
}

function migrateFilesInto(src, dst) {
  var files = src.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    if (file.getParents().hasNext() && file.getParents().next().getId() !== src.getId()) continue;
    if (dst.getFilesByName(file.getName()).hasNext()) {
      // Preserve both distinct files and make repeated migration a no-op.
      var name = file.getName();
      var dot = name.lastIndexOf('.');
      file.setName((dot > 0 ? name.slice(0, dot) : name) + ' - arsip ' + file.getId() + (dot > 0 ? name.slice(dot) : ''));
    }
    file.moveTo(dst);
  }
}

function getOrCreateFolder(parent, name) {
  var it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return parent.createFolder(name);
}

function doGet() {
  return ContentService.createTextOutput('DriveAuditWebApp OK. Gunakan POST JSON.')
    .setMimeType(ContentService.MimeType.TEXT);
}

function charisnaRoot() {
  return getOrCreateFolder(DriveApp.getRootFolder(), 'CHARISNA KOST');
}

// One-time organization preserves file IDs and existing sharing permissions.
function organizeCharisnaDrive() {
  var root = charisnaRoot();
  var system = getOrCreateFolder(root, 'Sistem');
  var automation = getOrCreateFolder(system, 'Otomasi');
  var recovery = getOrCreateFolder(system, 'Pemulihan');
  var oldFolders = DriveApp.getRootFolder().getFoldersByName('Charisna Audit');
  while (oldFolders.hasNext()) {
    var old = oldFolders.next();
    old.moveTo(root);
    old.setName(ROOT_FOLDER_NAME);
  }
  var names = ['CHARISNA KOST - Rekap Bulanan', 'CHARISNA KOST - Arsip Foto Kebersihan'];
  names.forEach(function(name) {
    var files = DriveApp.getRootFolder().getFilesByName(name);
    while (files.hasNext()) files.next().moveTo(automation);
  });
  var failed = DriveApp.getRootFolder().getFilesByName('Rekap November 2026');
  while (failed.hasNext()) failed.next().moveTo(recovery);
  migrateLegacyLayout(root);
  return root.getUrl();
}
