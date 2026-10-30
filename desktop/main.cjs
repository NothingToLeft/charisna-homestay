const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

const isDevelopment = Boolean(process.env.ELECTRON_DEV_URL);

function createWindow() {
  const window = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 920,
    minHeight: 620,
    title: 'Charisna Homestay',
    backgroundColor: '#f3f6f4',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  if (isDevelopment) {
    void window.loadURL(process.env.ELECTRON_DEV_URL);
    window.webContents.openDevTools({ mode: 'detach' });
  } else {
    void window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('mailto:') || url.startsWith('tel:')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    const current = window.webContents.getURL();
    if (url !== current && !url.startsWith('file://') && !url.startsWith(process.env.ELECTRON_DEV_URL || 'file://')) {
      event.preventDefault();
    }
  });
}

ipcMain.handle('file:save-text', async (_event, { suggestedName, content }) => {
  const result = await dialog.showSaveDialog({
    defaultPath: suggestedName,
    filters: [
      { name: 'JSON Backup', extensions: ['json'] },
      { name: 'CSV Spreadsheet', extensions: ['csv'] },
      { name: 'Semua File', extensions: ['*'] }
    ]
  });
  if (result.canceled || !result.filePath) return false;
  await fs.writeFile(result.filePath, content, 'utf8');
  return true;
});

ipcMain.handle('file:open-text', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Backup JSON', extensions: ['json'] },
      { name: 'Semua File', extensions: ['*'] }
    ]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const filePath = result.filePaths[0];
  return { name: path.basename(filePath), content: await fs.readFile(filePath, 'utf8') };
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
