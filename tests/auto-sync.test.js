import {describe,it,expect,vi} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import {syncContent,sameSyncData,mergeSyncData} from '../public/sync-merge.js';
const source=fs.readFileSync('public/cloud-sync.js','utf8');
const engineSource=source.slice(source.indexOf('const SYNC_DEBOUNCE_MS'),source.indexOf('window.charisnaAuditToken'));
const data=(price=1,time='2026-11-01T00:00:00.000Z')=>({rooms:[{id:'A',price}],tenants:[],bills:[],meta:{localUpdatedAt:time},privateIntegrations:{key:'test-only'}});
function setup(local,cloud){
 const state={local:structuredClone(local),cloud:structuredClone(cloud),writes:0,scheduled:[],events:{},saved:[]};
 const storage={getItem:key=>storage[key]||null,setItem:(key,value)=>{storage[key]=value;},removeItem:key=>{delete storage[key];}};
 const node=()=>({dataset:{},append(){},addEventListener(){},setAttribute(){},querySelector:()=>node(),querySelectorAll:()=>[]});
 const window={addEventListener:(event,handler)=>{state.events[event]=handler;},charisnaData:{snapshot:()=>structuredClone(state.local),validate:value=>structuredClone(value),hydrate:value=>{state.local=structuredClone(value);}},charisnaVault:{flush:async()=>{},backup:async()=>({encrypted:'test-envelope'}),save:async value=>{state.saved.push(structuredClone(value));}}};
 const snapshot=()=>({exists:()=>Boolean(state.cloud),data:()=>structuredClone(state.cloud),metadata:{hasPendingWrites:false}});
 const context={window,document:{getElementById:()=>node(),createElement:()=>node(),addEventListener(){}},localStorage:storage,navigator:{onLine:true},crypto:{randomUUID:()=>String(Math.random())},structuredClone,syncContent,sameSyncData,mergeSyncData,
  user:{uid:'owner'},verifiedRole:'OWNER',auth:{currentUser:{uid:'owner'}},cloudDoc:()=>({}),db:{},message:vi.fn(),confirm:vi.fn(()=>true),signOut:async()=>{},panel:node(),status:node(),openCloudPanel:vi.fn(),getDocFromServer:async()=>snapshot(),onSnapshot:(_ref,callback)=>{state.listener=callback;return()=>{state.stopped=true;};},
  runTransaction:async(_db,callback)=>callback({get:async()=>{if(state.beforeRead){const fn=state.beforeRead;state.beforeRead=null;fn();}return snapshot();},set:(_ref,value)=>{state.cloud=structuredClone(value);state.writes++;if(state.afterWrite)state.afterWrite();}}),
  setTimeout:fn=>{state.scheduled.push(fn);return state.scheduled.length;},clearTimeout(){},setInterval(){}};
 vm.runInNewContext(engineSource+';globalThis.engine={performUpload,downloadCloudData,reconcileAtStartup,startAutoSync,stopAutoSync,syncState};',context);
 return {state,engine:context.engine,context,storage};
}
describe('automatic sync through production engine',()=>{
 it('pulls a newer cloud snapshot automatically and retains local integration keys',async()=>{
  const {engine,state,context,storage}=setup(data(),{data:data(3),updatedAt:'2026-11-02T00:00:00.000Z'});
  await engine.reconcileAtStartup();
  expect(state.local.rooms[0].price).toBe(3);expect(state.local.privateIntegrations.key).toBe('test-only');
  expect(state.writes).toBe(0);expect(context.confirm).not.toHaveBeenCalled();
  const backups=Object.keys(storage).filter(key=>key.startsWith('CHARISNA_SYNC_RECOVERY_V2_'));
  expect(backups).toHaveLength(1);expect(JSON.parse(storage[backups[0]])).toEqual({encrypted:'test-envelope'});
 });
 it('pushes a saved edit and does not echo clean cloud data',async()=>{
  const {engine,state}=setup(data(),{data:data(),updatedAt:'2026-11-01T00:00:00.000Z'});
  await engine.reconcileAtStartup();state.local.rooms[0].price=4;
  await engine.reconcileAtStartup();expect(state.cloud.data.rooms[0].price).toBe(4);
  expect(state.cloud.data.privateIntegrations).toBeUndefined();
  await engine.reconcileAtStartup();expect(state.writes).toBe(1);
 });
 it('keeps an edit made while an upload is in flight queued for the next upload',async()=>{
  const {engine,state}=setup(data(),{data:data(),updatedAt:'2026-11-01T00:00:00.000Z'});
  await engine.reconcileAtStartup();state.local.rooms[0].price=4;
  state.afterWrite=()=>{state.afterWrite=null;state.local.rooms[0].price=5;};
  await engine.performUpload();expect(state.local.rooms[0].price).toBe(5);
  await engine.reconcileAtStartup();expect(state.cloud.data.rooms[0].price).toBe(5);
 });
 it('refuses to overwrite an unseen concurrent cloud write',async()=>{
  const {engine,state}=setup(data(),{data:data(),updatedAt:'2026-11-01T00:00:00.000Z'});
  await engine.reconcileAtStartup();state.local.rooms[0].price=4;
  state.beforeRead=()=>{state.cloud={data:data(9),updatedAt:'2026-11-03T00:00:00.000Z'};};
  expect(await engine.performUpload()).toBe(false);expect(state.cloud.data.rooms[0].price).toBe(9);expect(state.local.rooms[0].price).toBe(4);
  await engine.reconcileAtStartup();expect(state.cloud.data.rooms[0].price).toBe(4);
 });
 it('preserves local data if an encrypted recovery copy cannot be saved',async()=>{
  const {engine,state,context}=setup(data(),{data:data(3),updatedAt:'2026-11-02T00:00:00.000Z'});
  context.window.charisnaVault.backup=async()=>{throw Error('Quota');};
  expect(await engine.downloadCloudData()).toBe(false);expect(state.local.rooms[0].price).toBe(1);
 });
 it('automatically propagates a cleared cloud dataset',async()=>{
  const {engine,state}=setup(data(),{data:data(),updatedAt:'2026-11-01T00:00:00.000Z'});
  await engine.reconcileAtStartup();
  state.cloud={data:{...data(),rooms:[],tenants:[],bills:[]},updatedAt:'2026-11-03T00:00:00.000Z'};
  await engine.reconcileAtStartup();expect(state.local.rooms).toEqual([]);expect(state.writes).toBe(0);
 });
 it('retains offline changes and queues reconciliation when connection returns',()=>{
  const {engine,state,context}=setup(data(5),null);
  context.navigator.onLine=false;state.events['charisna:data-saved']();
  expect(state.scheduled).toHaveLength(0);expect(state.local.rooms[0].price).toBe(5);
  context.navigator.onLine=true;state.events.online();expect(state.scheduled).toHaveLength(1);
 });
 it('does not back up or hydrate the old account after an account switch',async()=>{
  const {engine,state,context,storage}=setup(data(),{data:data(),updatedAt:'2026-11-01T00:00:00.000Z'});
  await engine.reconcileAtStartup();state.local.rooms[0].price=4;
  context.getDocFromServer=async()=>{
   context.user={uid:'another-owner'};
   return {exists:()=>true,data:()=>({data:data(9),updatedAt:'2026-11-03T00:00:00.000Z'})};
  };
  expect(await engine.performUpload()).toBe(false);
  expect(state.writes).toBe(0);expect(state.saved).toHaveLength(0);
  expect(Object.keys(storage).filter(key=>key.startsWith('CHARISNA_SYNC_RECOVERY_V2_'))).toHaveLength(0);
 });
 it('queues realtime notifications and removes the old account listener',()=>{
  const {engine,state}=setup(data(),null);
  engine.startAutoSync();const previous=state.listener;
  state.scheduled=[];previous({metadata:{hasPendingWrites:false}});expect(state.scheduled).toHaveLength(1);
  engine.stopAutoSync();state.scheduled=[];previous({metadata:{hasPendingWrites:false}});expect(state.scheduled).toHaveLength(0);expect(state.stopped).toBe(true);
 });
});
