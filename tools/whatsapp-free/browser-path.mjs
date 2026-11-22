import fs from 'node:fs';
import path from 'node:path';

export function findBrowser({env = process.env, exists = fs.existsSync} = {}) {
  if (env.CHARISNA_CHROME_PATH) {
    if (exists(env.CHARISNA_CHROME_PATH)) return env.CHARISNA_CHROME_PATH;
    throw Error('CHARISNA_CHROME_PATH menunjuk browser yang tidak ditemukan. Perbaiki lokasi tersebut, lalu jalankan ulang.');
  }
  const programFiles = env.ProgramFiles || 'C:\\Program Files';
  const programFilesX86 = env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const bases = [programFiles, programFilesX86, env.LOCALAPPDATA].filter(Boolean);
  const candidates = [
    ...bases.map(base => path.win32.join(base, 'Google', 'Chrome', 'Application', 'chrome.exe')),
    ...bases.map(base => path.win32.join(base, 'Microsoft', 'Edge', 'Application', 'msedge.exe')),
  ];
  const found = candidates.find(candidate => exists(candidate));
  if (!found) throw Error('Google Chrome atau Microsoft Edge tidak ditemukan. Pasang atau perbarui browser, lalu jalankan ulang pendamping.');
  return found;
}

export function startupErrorMessage(error) {
  const detail = String(error?.message || error || 'Kesalahan tidak dikenal')
    .replace(/[A-Za-z0-9_-]{48,}/g, '[REDACTED]');
  return 'WhatsApp gagal dimulai. ' + detail.slice(0, 1600);
}
