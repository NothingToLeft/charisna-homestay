import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';

const source = readFileSync(new URL('../desktop/updates.cjs', import.meta.url), 'utf8');

function fixture(...responses) {
  const updater = {
    checkForUpdates: vi.fn(async () => ({ isUpdateAvailable: true, updateInfo: { version: '1.0.9' } })),
    downloadUpdate: vi.fn(async () => []),
    quitAndInstall: vi.fn(),
    on: vi.fn()
  };
  const dialog = { showMessageBox: vi.fn(async () => ({ response: responses.shift() })) };
  const window = {};
  const timers = [];
  const timer = callback => { timers.push(callback); return { unref() {} }; };
  const context = {
    require: name => name === 'electron-updater'
      ? { autoUpdater: updater }
      : { BrowserWindow: { getFocusedWindow: () => window, getAllWindows: () => [window] }, dialog },
    module: {}, console, setTimeout: timer, setInterval: timer
  };
  runInNewContext(source, context);
  context.module.exports.startWindowsUpdates();
  return { updater, dialog, timers };
}

it('asks before download and again before installing', async () => {
  const { updater, dialog, timers } = fixture(0, 0);
  timers[0]();
  await vi.waitFor(() => expect(updater.quitAndInstall).toHaveBeenCalledWith(false, true));
  expect(dialog.showMessageBox).toHaveBeenCalledTimes(2);
  expect(updater.downloadUpdate).toHaveBeenCalledTimes(1);
  expect(updater.autoInstallOnAppQuit).toBe(false);
  expect(updater.allowPrerelease).toBe(false);
});

it('does not download after Nanti or repeat the same offer during a session', async () => {
  const { updater, dialog, timers } = fixture(1);
  timers[0]();
  await vi.waitFor(() => expect(dialog.showMessageBox).toHaveBeenCalledTimes(1));
  timers[1]();
  await vi.waitFor(() => expect(updater.checkForUpdates).toHaveBeenCalledTimes(2));
  expect(dialog.showMessageBox).toHaveBeenCalledTimes(1);
  expect(updater.downloadUpdate).not.toHaveBeenCalled();
});
