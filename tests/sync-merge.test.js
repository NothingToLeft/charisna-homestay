import {describe,it,expect} from 'vitest';
import {syncContent,sameSyncData,mergeSyncData} from '../public/sync-merge.js';
describe('snapshot synchronization merge',()=>{
 it('excludes credentials and device timestamps from comparison',()=>{
  expect(syncContent({rooms:[],meta:{localUpdatedAt:'later'},privateIntegrations:{secret:'test'}})).toEqual({rooms:[]});
  expect(sameSyncData({a:1,b:2},{b:2,a:1})).toBe(true);
 });
 it('combines independent edits, additions and deletions across devices',()=>{
  const base={rooms:[{id:'A',price:1,status:'KOSONG'},{id:'B',price:2}]};
  const local={rooms:[{id:'A',price:3,status:'KOSONG'},{id:'C',price:4}]};
  const remote={rooms:[{id:'A',price:1,status:'TERISI'},{id:'B',price:2},{id:'D',price:5}]};
  const result=mergeSyncData(base,local,remote);
  expect(result.conflicts).toBe(0);
  expect(result.data.rooms).toEqual([{id:'A',price:3,status:'TERISI'},{id:'C',price:4},{id:'D',price:5}]);
 });
 it('keeps explicit local changes for conflicting values and reports the conflict',()=>{
  const result=mergeSyncData({price:1},{price:2},{price:3});
  expect(result).toEqual({data:{price:2},conflicts:1});
 });
 it('accepts remote changes when local state has no edits, including empty arrays',()=>{
  const base={rooms:[{id:'A'}]};
  expect(mergeSyncData(base,base,{rooms:[]}).data.rooms).toEqual([]);
 });
 it('does not resurrect a locally deleted entity in a delete-versus-edit conflict',()=>{
  const result=mergeSyncData({rooms:[{id:'A',price:1}]},{rooms:[]},{rooms:[{id:'A',price:2}]});
  expect(result.data.rooms).toEqual([]);expect(result.conflicts).toBe(1);
 });
});
