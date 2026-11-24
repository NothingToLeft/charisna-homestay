import {afterEach,describe,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import {syncContent,sameSyncData,mergeSyncData} from '../public/sync-merge.js';
const source=fs.readFileSync('public/cloud-sync.js','utf8');
const engine=source.slice(source.indexOf('// ==================== AUTO SYNC ENGINE'),source.indexOf('const checkCloudForNewerData'));
afterEach(()=>{vi.clearAllTimers();vi.useRealTimers();});
function setup(){
  vi.useFakeTimers();
  let local={rooms:[{id:'A',price:100,status:'KOSONG'}],tenants:[],bills:[],meta:{localUpdatedAt:'2026-11-22T01:00:00Z'},privateIntegrations:{privateKey:'test-only'}};
  let cloud={data:structuredClone(local),updatedAt:'2026-11-22T01:00:00Z',revision:'first'};
  const nodes=new Map(),changes=[];
  const node=id=>{if(!nodes.has(id)){let text='';nodes.set(id,{dataset:{},setAttribute:vi.fn(),get textContent(){return text;},set textContent(value){text=value;if(id==='badge')changes.push(value);}});}return nodes.get(id);};
  const storage=new Map();
  const snapshot=()=>{const current=structuredClone(cloud);return {exists:()=>Boolean(current),data:()=>current};};
  const read=vi.fn(async()=>snapshot());
  const transaction=vi.fn(async(_db,run)=>run({get:async()=>snapshot(),set:(_ref,data)=>{cloud=structuredClone(data);}}));
  const vault={flush:vi.fn(async()=>{}),save:vi.fn(async()=>{}),backup:vi.fn(async()=>({encrypted:'test-fixture'}))};
  const hydrate=vi.fn(data=>{local=structuredClone(data);});
  const online={onLine:true};
  let listener;
  const context=vm.createContext({syncContent,sameSyncData,mergeSyncData,structuredClone,Intl,crypto:{randomUUID:()=>String(Math.random())},navigator:online,
    setTimeout,clearTimeout,localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
    window:{charisnaVault:vault,charisnaData:{snapshot:()=>structuredClone(local),validate:data=>structuredClone(data),hydrate}},
    user:{uid:'owner-a'},auth:{currentUser:{uid:'owner-a'}},verifiedRole:'OWNER',db:{},cloudDoc:()=>'/owner-a/current',
    document:{getElementById:()=>node('badge')},panel:{querySelector:selector=>node(selector)},status:node('settings-status'),
    message:text=>node('#cloud-message').textContent=text,confirm:()=>true,getDocFromServer:read,runTransaction:transaction,
    onSnapshot:(_ref,callback)=>{listener=callback;return ()=>{};}
  });
  vm.runInContext(engine+'\n globalThis.api={reconcileAtStartup,queueSync,startAutoSync,stopAutoSync,performUpload,get state(){return syncState;},switchOwner(){user={uid:"owner-b"};auth.currentUser=user;}};',context);
  return {api:context.api,node,changes,read,transaction,vault,hydrate,online,get local(){return local;},get cloud(){return cloud;},edit:patch=>{local={...local,...patch};},remote:patch=>{cloud={...cloud,...patch,revision:'changed'};},emit:()=>listener({metadata:{hasPendingWrites:false}})};
}
describe('automatic cloud synchronization engine',()=>{
  it('uploads a saved edit after debounce without manual controls',async()=>{
    const t=setup();await t.api.reconcileAtStartup();t.edit({rooms:[{id:'A',price:200,status:'KOSONG'}]});t.api.queueSync();
    t.read.mockClear();
    await vi.advanceTimersByTimeAsync(1500);
    expect(t.cloud.data.rooms[0].price).toBe(200);expect(t.node('badge').dataset.state).toBe('ok');expect(t.transaction).toHaveBeenCalledTimes(1);
    expect(t.read).toHaveBeenCalledTimes(1);
  });
  it('receives another device edit automatically from the listener',async()=>{
    const t=setup();t.api.startAutoSync();await vi.advanceTimersByTimeAsync(0);
    t.remote({data:{...t.cloud.data,rooms:[{id:'A',price:300,status:'KOSONG'}]}});t.emit();await vi.advanceTimersByTimeAsync(100);
    expect(t.local.rooms[0].price).toBe(300);expect(t.transaction).not.toHaveBeenCalled();
  });
  it('does not flash syncing for an unchanged background check',async()=>{
    const t=setup();await t.api.reconcileAtStartup();t.changes.length=0;await t.api.reconcileAtStartup();
    expect(t.changes).toEqual([]);expect(t.node('badge').textContent).toBe('Tersinkron');
  });
  it('keeps offline edits and uploads them after reconnection',async()=>{
    const t=setup();await t.api.reconcileAtStartup();const reads=t.read.mock.calls.length;t.online.onLine=false;
    t.edit({rooms:[{id:'A',price:400,status:'KOSONG'}]});t.api.queueSync();await vi.advanceTimersByTimeAsync(10000);
    expect(t.read).toHaveBeenCalledTimes(reads);expect(t.local.rooms[0].price).toBe(400);expect(t.node('badge').textContent).toBe('Offline');
    t.online.onLine=true;t.api.queueSync(0);await vi.advanceTimersByTimeAsync(0);expect(t.cloud.data.rooms[0].price).toBe(400);
  });
  it('retries a stalled read automatically instead of showing syncing forever',async()=>{
    const t=setup();t.read.mockImplementationOnce(()=>new Promise(()=>{}));const pending=t.api.reconcileAtStartup();
    await vi.advanceTimersByTimeAsync(12000);
    expect(t.node('badge').dataset.state).toBe('error');
    expect(t.node('#cloud-message').textContent).toContain('lebih lama');
    await vi.advanceTimersByTimeAsync(8000);await pending;
    expect(t.node('badge').dataset.state).toBe('error');expect(t.node('#cloud-message').textContent).toContain('Cloud belum merespons');
    await vi.advanceTimersByTimeAsync(5000);expect(t.node('badge').dataset.state).toBe('ok');
  });
  it('serializes checks while a cloud read is pending',async()=>{
    const t=setup();let resolve;const response={exists:()=>true,data:()=>t.cloud};t.read.mockImplementationOnce(()=>new Promise(done=>{resolve=done;}));
    const first=t.api.reconcileAtStartup();await vi.advanceTimersByTimeAsync(0);await t.api.reconcileAtStartup();expect(t.read).toHaveBeenCalledTimes(1);
    resolve(response);await first;expect(t.node('badge').dataset.state).toBe('ok');
  });
  it('shows a pending upload after a stalled write and prevents the late callback from writing',async()=>{
    const t=setup();
    await t.api.reconcileAtStartup();
    t.edit({rooms:[{id:'A',price:450,status:'KOSONG'}]});
    let late;
    const set=vi.fn();
    t.transaction.mockImplementationOnce((_db,run)=>new Promise((resolve,reject)=>{
      late=()=>run({get:async()=>({exists:()=>true,data:()=>t.cloud}),set}).then(resolve,reject);
    }));
    const pending=t.api.performUpload();
    await vi.advanceTimersByTimeAsync(20000);
    expect(await pending).toBe(false);
    expect(t.node('badge').dataset.state).toBe('error');
    expect(t.local.rooms[0].price).toBe(450);
    await late();
    expect(set).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(3000);
    expect(t.cloud.data.rooms[0].price).toBe(450);
    expect(t.node('badge').dataset.state).toBe('ok');
  });
  it('ignores old account results after account switch',async()=>{
    const t=setup();let resolve;t.read.mockImplementationOnce(()=>new Promise(done=>{resolve=done;}));
    const first=t.api.reconcileAtStartup();await vi.advanceTimersByTimeAsync(0);t.api.stopAutoSync();t.api.switchOwner();resolve({exists:()=>true,data:()=>t.cloud});await first;
    expect(t.hydrate).not.toHaveBeenCalled();expect(t.transaction).not.toHaveBeenCalled();
  });
  it('merges independent local and remote changes without losing either',async()=>{
    const t=setup();await t.api.reconcileAtStartup();t.edit({rooms:[{id:'A',price:200,status:'KOSONG'}]});
    t.remote({data:{...t.cloud.data,rooms:[{id:'A',price:100,status:'TERISI'}]}});t.api.queueSync(0);await vi.advanceTimersByTimeAsync(0);
    expect(t.cloud.data.rooms[0]).toMatchObject({price:200,status:'TERISI'});expect(t.local.privateIntegrations.privateKey).toBe('test-only');
  });
});
