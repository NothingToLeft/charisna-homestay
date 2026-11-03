import { describe, it, expect } from 'vitest';

// Mirror of the Apps Script folder helpers (apps-script/DriveAuditWebApp.gs)
// so the layout + migration algorithm can be verified locally.
class Folder {
  constructor(name, parent) {
    this.name = name;
    this.parent = parent || null;
    this.childFolders = [];
    this.files = [];
    this.id = parent ? `${parent.id}/${name}` : 'root';
    if (parent) parent.childFolders.push(this);
  }
  getFoldersByName(n) { return this.childFolders.filter(f => f.name === n); }
  getFolders() { return this.childFolders.slice(); }
  getFiles() { return this.files.slice(); }
  getFilesByName(n) { return this.files.filter(f => f.name === n); }
  createFolder(name) { return new Folder(name, this); }
  getParents() { return this.parent ? [this.parent] : []; }
}

function getOrCreateFolder(parent, name) {
  const found = parent.getFoldersByName(name);
  return found.length ? found[0] : parent.createFolder(name);
}

const ROOT_FOLDER_NAME = 'Rekap Bulanan';

function ensureFolderChain(root, payload) {
  const year = String(payload.year || '');
  const assetName = String(payload.assetName || 'Gabungan Semua Properti').trim().replace(/[\\/:*?"<>|\r\n]/g, '-').slice(0, 100);
  if (!assetName || assetName === '.' || assetName === '..') throw new Error('Nama properti tidak valid');
  let folder = getOrCreateFolder(root, assetName);
  if (year) folder = getOrCreateFolder(folder, year);
  return getOrCreateFolder(folder, payload.monthKey || 'bulan');
}

function migrateLegacyLayout(root) {
  for (const legacy of root.getFoldersByName(ROOT_FOLDER_NAME)) {
    for (const asset of legacy.getFolders()) {
      migrateFolderTree(asset, getOrCreateFolder(root, asset.name));
    }
  }
}
function migrateFolderTree(src, dst) {
  for (const group of src.getFolders()) {
    const groupDst = getOrCreateFolder(dst, group.name);
    for (const month of group.getFolders()) {
      migrateFilesInto(month, getOrCreateFolder(groupDst, month.name));
    }
    migrateFilesInto(group, groupDst);
  }
  migrateFilesInto(src, dst);
}
function migrateFilesInto(src, dst) {
  for (const file of src.getFiles()) {
    const parents = file.getParents();
    if (parents.length && parents[0].id !== src.id) continue;
    if (dst.getFilesByName(file.name).length) continue; // hindari duplikat
    file.parent = dst;
    dst.files.push(file);
    src.files = src.files.filter(f => f !== file);
  }
}

function seedLegacy(tree, asset, year, month, fileName) {
  const legacy = getOrCreateFolder(tree.root, ROOT_FOLDER_NAME);
  const m = getOrCreateFolder(getOrCreateFolder(getOrCreateFolder(legacy, asset), year), month);
  const f = { name: fileName, id: `${m.id}/${fileName}`, getParents: () => [m] };
  m.files.push(f);
  return f;
}
function folderAt(root, names) {
  return names.reduce((p, n) => getOrCreateFolder(p, n), root);
}

describe('drive layout', () => {
  it('ensureFolderChain menaruh aset langsung di bawah root (tanpa Rekap Bulanan)', () => {
    const root = new Folder('CHARISNA KOST', null);
    const folder = ensureFolderChain(root, { assetName: 'Kost 1', year: '2026', monthKey: '2026-11' });
    expect(folder.id).toBe('root/Kost 1/2026/2026-11');
    expect(root.getFoldersByName(ROOT_FOLDER_NAME).length).toBe(0);
  });

  it('ensureFolderChain default ke Gabungan Semua Properti + sanitasi nama', () => {
    const root = new Folder('CHARISNA KOST', null);
    const folder = ensureFolderChain(root, { assetName: 'Kost/1: *?', year: '2026', monthKey: '2026-11' });
    expect(folder.id.startsWith('root/Kost-1-')).toBe(true);
    const g = ensureFolderChain(root, { year: '2026', monthKey: '2026-11' });
    expect(g.id).toBe('root/Gabungan Semua Properti/2026/2026-11');
  });

  it('migrasi layout lama: file pindah ke root/aset/tahun/bulan, idempotent', () => {
    const root = new Folder('CHARISNA KOST', null);
    const f = seedLegacy({ root }, 'Kost 1', '2026', '2026-11', 'Rekap-2026-11.xlsx');
    migrateLegacyLayout(root);

    const target = folderAt(root, ['Kost 1', '2026', '2026-11']);
    expect(target.getFilesByName('Rekap-2026-11.xlsx')[0]).toBe(f);

    const legacyMonth = folderAt(root, ['Rekap Bulanan', 'Kost 1', '2026', '2026-11']);
    expect(legacyMonth.getFiles().length).toBe(0);

    migrateLegacyLayout(root);
    expect(target.getFilesByName('Rekap-2026-11.xlsx').length).toBe(1);
  });

  it('migrasi tidak menimpa/duplikat jika file sudah ada di tujuan', () => {
    const root = new Folder('CHARISNA KOST', null);
    seedLegacy({ root }, 'Kost 1', '2026', '2026-11', 'Rekap-2026-11.xlsx');
    const target = folderAt(root, ['Kost 1', '2026', '2026-11']);
    const existing = { name: 'Rekap-2026-11.xlsx', id: 'target-file', getParents: () => [target] };
    target.files.push(existing);
    migrateLegacyLayout(root);
    expect(target.getFilesByName('Rekap-2026-11.xlsx').length).toBe(1);
    expect(target.getFilesByName('Rekap-2026-11.xlsx')[0]).toBe(existing);
  });
});
