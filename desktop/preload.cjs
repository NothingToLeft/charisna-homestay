const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('managementDesktop', {
  isDesktop: true,
  saveTextFile: (suggestedName, content) => ipcRenderer.invoke('file:save-text', { suggestedName, content }),
  openTextFile: () => ipcRenderer.invoke('file:open-text')
});
