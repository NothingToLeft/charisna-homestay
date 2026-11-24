const { autoUpdater } = require('electron-updater');
const { BrowserWindow, dialog } = require('electron');

const CHECK_INTERVAL = 4 * 60 * 60 * 1000;

function startWindowsUpdates() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;
  autoUpdater.disableWebInstaller = true;

  let active = false;
  let offeredVersion;
  const message = options => {
    const parent = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    return parent ? dialog.showMessageBox(parent, options) : dialog.showMessageBox(options);
  };
  autoUpdater.on('error', error => console.warn('Pembaruan Windows:', error.message));

  async function check() {
    if (active || !BrowserWindow.getAllWindows().length) return;
    active = true;
    try {
      let update;
      try {
        update = await autoUpdater.checkForUpdates();
      } catch {
        return;
      }
      if (!update?.isUpdateAvailable || offeredVersion === update.updateInfo.version) return;

      const version = update.updateInfo.version;
      offeredVersion = version;
      const download = await message({
        type: 'info', title: 'Pembaruan CHARISNA KOST',
        message: `Versi ${version} tersedia`,
        detail: 'Unduh di aplikasi. Anda bisa tetap bekerja selama unduhan berlangsung.',
        buttons: ['Unduh pembaruan', 'Nanti'], defaultId: 0, cancelId: 1
      });
      if (download.response !== 0) return;

      await autoUpdater.downloadUpdate();
      const install = await message({
        type: 'info', title: 'Pembaruan siap dipasang',
        message: `Versi ${version} sudah diunduh`,
        detail: 'Simpan pekerjaan sebelum melanjutkan. CHARISNA KOST akan ditutup dan dibuka kembali.',
        buttons: ['Pasang dan mulai ulang', 'Nanti'], defaultId: 1, cancelId: 1
      });
      if (install.response === 0) autoUpdater.quitAndInstall(false, true);
    } catch {
      offeredVersion = undefined;
      if (BrowserWindow.getAllWindows().length) {
        await message({
          type: 'warning', title: 'Pembaruan belum selesai',
          message: 'Pembaruan gagal diunduh atau dibuka.',
          detail: 'Coba lagi dengan membuka ulang aplikasi saat tersambung internet.',
          buttons: ['Tutup']
        });
      }
    } finally {
      active = false;
    }
  }

  setTimeout(() => void check(), 5000).unref();
  setInterval(() => void check(), CHECK_INTERVAL).unref();
}

module.exports = { startWindowsUpdates };
