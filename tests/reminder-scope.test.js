import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('public/feature-modules.js','utf8');
const fn=source.slice(source.indexOf('    function computeDueReminders()'),source.indexOf('    function renderDashboardReminders()'));
const roomA={id:'A',number:'101',propertyId:'A'};
const roomB={id:'B',number:'102',propertyId:'B'};
const bill=(roomNumber,extra={})=>({roomNumber,status:'BELUM_LUNAS',dueDate:'2020-01-01',...extra});
const compute=(data,scope)=>vm.runInNewContext(fn+';computeDueReminders()', {window:{charisnaData:{snapshot:()=>data},getScopedRooms:()=>scope}});
describe('dashboard reminder scope',()=>{
 it('does not show orphan reminders after all rooms are removed',()=>{
  const result=compute({rooms:[],bills:[bill('101')],kontrak:[{roomNumber:'101',endDate:'2099-01-01'}]},[]);
  expect(result.overdueBills).toHaveLength(0);expect(result.expiringContracts).toHaveLength(0);
 });
 it('follows the selected property',()=>{
  const data={rooms:[roomA,roomB],bills:[bill('101'),bill('102')]};
  expect(compute(data,[roomA]).overdueBills.map(item=>item.roomNumber)).toEqual(['101']);
  expect(compute(data,[roomB]).overdueBills.map(item=>item.roomNumber)).toEqual(['102']);
 });
 it('rejects ambiguous legacy bills and respects explicit property identifiers',()=>{
  const same={...roomB,number:'101'};
  const data={rooms:[roomA,same],bills:[bill('101'),bill('101',{propertyId:'B'})]};
  expect(compute(data,[roomA]).overdueBills).toHaveLength(0);
  expect(compute(data,[same]).overdueBills).toHaveLength(1);
 });
 it('uses fresh records after data is cleared',()=>{
  const data={rooms:[roomA],bills:[bill('101')]};
  expect(compute(data,[roomA]).overdueBills).toHaveLength(1);
  data.bills=[];
  expect(compute(data,[roomA]).overdueBills).toHaveLength(0);
 });
});
