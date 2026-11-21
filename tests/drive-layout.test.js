import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect } from 'vitest';
let nextId = 0;
const iterator = list => { let i = 0; return { hasNext: () => i < list.length, next: () => list[i++] }; };
class Folder {
  constructor(name, parent) { this.name=name; this.parent=parent; this.id=String(++nextId); this.folders=[]; this.files=[]; if(parent) parent.folders.push(this); }
  getName() { return this.name; }
  getId() { return this.id; }
  getParents() { return iterator(this.parent ? [this.parent] : []); }
  getFoldersByName(name) { return iterator(this.folders.filter(f=>f.name===name)); }
  getFolders() { return iterator([...this.folders]); }
  getFiles() { return iterator([...this.files]); }
  getFilesByName(name) { return iterator(this.files.filter(f=>f.name===name)); }
  getFileByName() { throw new Error('getFileByName must not hide replacement bugs'); }
  createFolder(name) { return new Folder(name,this); }
  createFile(blob) {
    const f = new File(typeof blob === 'string' ? blob : (blob && blob.getName ? blob.getName() : 'file'), this);
    f.setSharing = () => {};
    f.getUrl = () => 'https://drive.google.com/file/d/' + f.id;
    f.setContent = () => {};
    return f;
  }
}
class File {
  constructor(name,parent) { this.name=name;this.parent=parent;this.id=String(++nextId);parent.files.push(this); }
  getName() { return this.name; }
  getId() { return this.id; }
  getUrl() { return 'https://drive.google.com/file/d/' + this.id; }
  setSharing() {}
  setContent() {}
  getParents() { return iterator([this.parent]); }
  setName(name) { this.name=name; }
  setTrashed(value) { this.trashed=value; }
  moveTo(parent) { this.parent.files=this.parent.files.filter(f=>f!==this);this.parent=parent;parent.files.push(this); }
}
function setup() {
  const drive=new Folder('My Drive');const root=drive.createFolder('CHARISNA KOST');
  const api={
    DriveApp:{ getRootFolder:()=>drive },
    LockService:{ getScriptLock:()=>({ waitLock:()=>{}, releaseLock:()=>{} }) }
  };
  runInNewContext(readFileSync('apps-script/DriveAuditWebApp.gs','utf8'),api);
  const at=(names)=>names.reduce((p,n)=>api.getOrCreateFolder(p,n),root);
  return {root,api,at};
}

describe('actual Apps Script Drive migration',()=>{
  it('rejects unsupported upload MIME types',()=>{
    const {api}=setup();
    api.requireAuditOwner=()=>true;
    api.Utilities={base64Decode:(str)=>Buffer.from(str,'base64')};
    api.ContentService={MimeType:{JSON:'application/json'},createTextOutput:(str)=>({setMimeType:()=>JSON.parse(str)})};
    const res=api.doPost({postData:{contents:JSON.stringify({action:'uploadAttachment',idToken:'valid-token',year:'2026',monthKey:'2026-11',mimeType:'text/html',base64:'SGVsbG8='})}});
    expect(res.ok).toBe(false);
    expect(res.error).toContain('MIME type tidak didukung');
  });

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
  it('replaces duplicate attachment name safely',()=>{
    const {api,at}=setup();
    const folder=at(['Kost 1','2026','2026-11','ktp','101']);
    const oldFile=new File('ktp.jpg',folder);
    const blob={getName:()=> 'ktp.jpg'};
    const replacement=api.replaceBinaryFileInFolder(folder,'ktp.jpg',blob);
    expect(oldFile.trashed).toBe(true);
    expect(replacement.getName()).toBe('ktp.jpg');
  });

  it('handles uploadAttachment action in doPost mock',()=>{
    const {api}=setup();
    api.requireAuditOwner=()=>true;
    api.Utilities={
      base64Decode:(str)=>Buffer.from(str,'base64'),
      newBlob:(bytes,mime,name)=>({
        getName:()=>name,
        getMimeType:()=>mime,
        getBytes:()=>bytes
      })
    };
    api.DriveApp.Access={ANYONE_WITH_LINK:'ANYONE_WITH_LINK'};
    api.DriveApp.Permission={VIEW:'VIEW'};
    api.ContentService={
      MimeType:{JSON:'application/json'},
      createTextOutput:(str)=>({
        setMimeType:(m)=>JSON.parse(str)
      })
    };
    const res = api.doPost({
      postData: {
        contents: JSON.stringify({
          action: 'uploadAttachment',
          idToken: 'valid-token',
          assetName: 'CHARISNA KOST Pusat',
          year: '2026',
          monthKey: '2026-11',
          category: 'ktp',
          entityId: '101',
          fileName: 'ktp-dimas.jpg',
          mimeType: 'image/jpeg',
          base64: ' /9j/4AAQSkZJRgABAQAAAQABAAD/2w=='
        })
      }
    });
    expect(res.ok).toBe(true);
    expect(res.fileId).toBeDefined();
    expect(res.path).toContain('CHARISNA KOST Pusat');
    expect(res.path).toContain('ktp');
  });
});
