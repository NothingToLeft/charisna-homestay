import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect } from 'vitest';
let nextId = 0;
const iterator = list => { let i = 0; return { hasNext: () => i < list.length, next: () => list[i++] }; };
class Folder {
  constructor(name, parent) { this.name=name; this.parent=parent; this.id=String(++nextId); this.folders=[]; this.files=[]; if(parent) parent.folders.push(this); }
  getName() { return this.name; }
  getId() { return this.id; }
  getFoldersByName(name) { return iterator(this.folders.filter(f=>f.name===name)); }
  getFolders() { return iterator([...this.folders]); }
  getFiles() { return iterator([...this.files]); }
  getFilesByName(name) { return iterator(this.files.filter(f=>f.name===name)); }
  createFolder(name) { return new Folder(name,this); }
}
class File {
  constructor(name,parent) { this.name=name;this.parent=parent;this.id=String(++nextId);parent.files.push(this); }
  getName() { return this.name; }
  getId() { return this.id; }
  getParents() { return iterator([this.parent]); }
  setName(name) { this.name=name; }
  moveTo(parent) { this.parent.files=this.parent.files.filter(f=>f!==this);this.parent=parent;parent.files.push(this); }
}
function setup() {
  const drive=new Folder('My Drive');const root=drive.createFolder('CHARISNA KOST');
  const api={ DriveApp:{ getRootFolder:()=>drive } };
  runInNewContext(readFileSync('apps-script/DriveAuditWebApp.gs','utf8'),api);
  const at=(names)=>names.reduce((p,n)=>api.getOrCreateFolder(p,n),root);
  return {root,api,at};
}
describe('actual Apps Script Drive migration',()=>{
  it('creates asset/year/month folders',()=>{
    const {api,at}=setup();expect(api.ensureFolderChain({assetName:'Kost 1',year:'2026',monthKey:'2026-11'})).toBe(at(['Kost 1','2026','2026-11']));
  });
  it('migrates year-only archives under combined property and is idempotent',()=>{
    const {api,root,at}=setup();const file=new File('report.xlsx',at(['Rekap Bulanan','2026','2026-11']));
    api.migrateLegacyLayout(root);api.migrateLegacyLayout(root);
    expect(at(['Gabungan Semua Properti','2026','2026-11']).files).toEqual([file]);
  });
  it('preserves both files with colliding names and nested asset folders',()=>{
    const {api,root,at}=setup();const source=new File('report.xlsx',at(['Rekap Bulanan','Kost 1','2026','2026-11']));
    const target=at(['Kost 1','2026','2026-11']);const existing=new File('report.xlsx',target);
    api.migrateLegacyLayout(root);api.migrateLegacyLayout(root);
    expect(target.files).toEqual([existing,source]);expect(source.name).toContain('arsip');
  });
  it('preserves loose files in system recovery',()=>{
    const {api,root,at}=setup();const file=new File('loose.xlsx',at(['Rekap Bulanan']));
    api.migrateLegacyLayout(root);expect(at(['Sistem','Pemulihan']).files).toEqual([file]);
  });
});
