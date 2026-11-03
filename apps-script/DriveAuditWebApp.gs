/**
 * DriveAuditWebApp.gs
 * Web App Google Apps Script untuk menerima rekapan bulanan dari
 * aplikasi Charisna Kost lalu menyimpannya ke Google Drive:
 *   Drive / <nama root> / <Tahun> / <Tahun-Bulan> / Rekap-<Tahun-Bulan>.xlsx
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
 * Catatan keamanan: siapa pun yang punya URL dapat mengirim data dan
 * hanya akan menulis ke folder root khusus (default "Charisna Audit").
 * Ganti ROOT_FOLDER_NAME bila perlu.
 */

var ROOT_FOLDER_NAME = 'Charisna Audit';

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var folder = ensureFolderChain(payload);
    var monthKey = payload.monthKey || 'unknown';
    var label = monthKey + '-' + (payload.monthLabel || '');

    // 1) Excel (.xlsx) dari Spreadsheet
    var ss = SpreadsheetApp.create('Rekap ' + (payload.monthLabel || monthKey));
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

    var driveFile = DriveApp.getFileById(ss.getId());
    var bytes = driveFile.getAs('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
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

function ensureFolderChain(payload) {
  var year = String(payload.year || '');
  var folder = getOrCreateFolder(DriveApp.getRootFolder(), ROOT_FOLDER_NAME);
  if (year) folder = getOrCreateFolder(folder, year);
  return getOrCreateFolder(folder, payload.monthKey || 'bulan');
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
