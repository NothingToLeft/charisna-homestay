import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';
const scope = runInNewContext(readFileSync(new URL('../public/audit-scope.js', import.meta.url), 'utf8') + '; auditScopeData');
it('isolates property records and keeps ambiguous/global records only in the combined report', () => {
  const data = {
    rooms: [{number:'101',propertyId:'A'}, {number:'201',propertyId:'B'}, {number:'X',propertyId:'A'}, {number:'X',propertyId:'B'}],
    tenants: [{id:'ta',name:'A',roomNumber:'101'}, {id:'tb',name:'B',roomNumber:'201'}],
    bills: [{id:'a',roomNumber:'101'}, {id:'b',roomNumber:'201'}, {id:'ambiguous',roomNumber:'X'}],
    expenses: [{id:'shared'}, {id:'a',propertyId:'A'}],
    stok: [{id:'sa',propertyId:'A'}, {id:'shared'}],
    stokMutasi: [{itemId:'sa'}, {itemId:'shared'}],
    meter: [{ref:'101'}, {ref:'Umum'}],
    tagihanBertahap: [{tenantName:'A'}, {tenantName:'B'}]
  };
  const selected = scope(data,'A');
  expect(selected.bills.map((x:any)=>x.id)).toEqual(['a']);
  expect(selected.expenses.map((x:any)=>x.id)).toEqual(['a']);
  expect(selected.stokMutasi.map((x:any)=>x.itemId)).toEqual(['sa']);
  expect(selected.meter.map((x:any)=>x.ref)).toEqual(['101']);
  expect(selected.tagihanBertahap.map((x:any)=>x.tenantName)).toEqual(['A']);
  expect(scope(data,'ALL')).toBe(data);
  expect(data.bills).toHaveLength(3);
});
