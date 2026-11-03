// Smoke test: modul Operasional & Inventaris
// Load app (dist) di Electron headless, switch ke tab operasional,
// buka tiap sub-pane, verifikasi data render, tangkap error JS.
const { app, BrowserWindow } = require('electron');

const URL = process.env.SMOKE_URL || 'http://127.0.0.1:4199/';
const errors = [];
let result = null;

app.disableHardwareAcceleration();

const CHECK_JS = `(() => {
  const out = {};
  try {
    out.hasTab = !!document.getElementById('tab-operasional');
    out.title = document.title;
    if (window.switchTab) window.switchTab('operasional');
    const badge = document.getElementById('badge-operasional');
    out.badge = badge ? badge.textContent : null;

    const rowCount = id => {
      const el = document.getElementById(id);
      return el ? document.querySelectorAll('#' + id + ' tr').length : -1;
    };
    out.invRows = rowCount('inventarisTableBody');

    const panes = ['stok', 'perawatan', 'kontrak', 'meter'];
    const counts = {};
    for (const p of panes) {
      if (window.switchOper) window.switchOper(p);
      const tbId = p === 'stok' ? 'stokTableBody'
        : p === 'perawatan' ? 'perawatanTableBody'
        : p === 'kontrak' ? 'kontrakTableBody' : 'meterTableBody';
      counts[p] = rowCount(tbId);
    }
    out.paneCounts = counts;
    out.tagihanList = document.querySelectorAll('#tagihanBertahapList > div').length;
    out.laporanStats = document.getElementById('laporanStats')
      ? document.getElementById('laporanStats').children.length : -1;
    out.laporanInv = document.getElementById('laporanInventaris')
      ? document.getElementById('laporanInventaris').children.length : -1;
    out.alertVisible = document.getElementById('op-alert')
      ? !document.getElementById('op-alert').classList.contains('hidden') : null;
    return out;
  } catch (e) { out.exception = String(e && e.stack || e); return out; }
})()`;

async function run() {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });
  win.webContents.on('console-message', (e, level, message) => {
    if (level >= 2 && /error/i.test(String(message))) errors.push(String(message).split('\n')[0]);
  });
  win.webContents.on('render-process-gone', (e, d) => errors.push('renderer gone: ' + d.reason));

  try {
    await win.loadURL(URL);
    await new Promise(r => setTimeout(r, 4000));
    result = await win.webContents.executeJavaScript(CHECK_JS);
  } catch (e) {
    errors.push('load/exec failed: ' + e);
  }

  // Bagian 2: uji interaksi tulis
  let interact = null;
  const INTERACT_JS = `(() => {
    const out = {};
    try {
      // tambah inventaris
      const beforeInv = document.querySelectorAll('#inventarisTableBody tr').length;
      document.getElementById('invFormProperty').value = 'PROP-1';
      document.getElementById('invFormRoom').value = '105';
      document.getElementById('invFormItem').value = 'Kipas Angin';
      document.getElementById('invFormQty').value = 2;
      window.addInventaris();
      out.invAfter = document.querySelectorAll('#inventarisTableBody tr').length;
      out.invDelta = out.invAfter - beforeInv;

      // mutasi stok MASUK ke STK-1 (nama: Sabun cuci piring)
      const beforeMut = document.querySelectorAll('#mutasiTableBody tr').length;
      document.getElementById('mutFormItem').value = 'STK-1';
      document.getElementById('mutFormType').value = 'MASUK';
      document.getElementById('mutFormQty').value = 3;
      document.getElementById('mutFormNote').value = 'uji';
      window.addMutasi();
      out.mutAfter = document.querySelectorAll('#mutasiTableBody tr').length;
      out.mutDelta = out.mutAfter - beforeMut;
      const stkRows = document.querySelectorAll('#stokTableBody tr');
      let stk1Qty = -1;
      for (const tr of stkRows) {
        const cells = tr.querySelectorAll('td');
        if (cells.length && cells[0].textContent.trim() === 'Sabun cuci piring') {
          stk1Qty = parseInt(cells[2].textContent, 10); // qty cell
          break;
        }
      }
      out.stk1Qty = stk1Qty; // default 8 + 3 = 11

      // tandai tahap 3 TGB-1 lunas
      const lunasCount = () => Array.from(document.querySelectorAll('#tagihanBertahapList span'))
        .filter(s => s.textContent.trim() === 'LUNAS').length;
      const beforePaid = lunasCount(); // default 2 lunas
      window.markStagePaid('TGB-1', 3);
      out.paidAfter = lunasCount();
      out.paidDelta = out.paidAfter - beforePaid;

      return out;
    } catch (e) { out.exception = String(e && e.stack || e); return out; }
  })()`;
  try {
    interact = await win.webContents.executeJavaScript(INTERACT_JS);
  } catch (e) {
    errors.push('interact exec failed: ' + e);
  }
  console.log('SMOKE_INTERACT ' + JSON.stringify(interact));

  const ok = !errors.length && result && result.hasTab && !result.exception && result.invRows > 0
    && interact && !interact.exception
    && interact.invDelta === 1 && interact.mutDelta === 1 && interact.stk1Qty === 11 && interact.paidDelta === 1;
  app.exit(ok ? 0 : 1);
}

app.whenReady().then(run);
