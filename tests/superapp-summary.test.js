import {describe,it,expect} from 'vitest';
import {buildKostSnapshot,isExampleKostData} from '../public/superapp-summary.js';

const data=()=>({properties:[{id:'P-1',name:'Kost Utama'},{id:'P-2',name:'Kost Kedua'}],rooms:[
  {id:'R1',propertyId:'P-1',number:'101',status:'TERISI'},
  {id:'R2',propertyId:'P-1',number:'102',status:'KOSONG'},
  {id:'R3',propertyId:'P-2',number:'101',status:'TERISI'},
  {id:'R4',propertyId:'P-2',number:'202',status:'PERBAIKAN'}],bills:[
  {id:'B1',propertyId:'P-1',roomNumber:'101',tenantName:'Private Name',phone:'08123',amount:1200000,status:'LUNAS',paidDate:'2026-11-04'},
  {id:'B2',propertyId:'P-2',roomNumber:'202',amount:900000,status:'LUNAS',paidDate:'2026-10-04'},
  {id:'B3',propertyId:'P-2',roomNumber:'202',amount:1000000,status:'BELUM_LUNAS'},
  {id:'B4',roomNumber:'101',amount:500000,status:'BELUM_LUNAS'}]});

describe('ringkasan KOST untuk SuperApp',()=>{
  it('menghitung tiap properti tanpa mengirim identitas penghuni',()=>{
    const result=buildKostSnapshot(data(),new Date('2026-11-07T02:00:00Z'));
    expect(result.month).toBe('2026-11');
    expect(result.is_demo).toBe(false);
    expect(result.properties).toEqual([
      {id:'P-1',name:'Kost Utama',occupied_rooms:1,total_rooms:2,paid_this_month_idr:'1200000',unpaid_bills_idr:'0'},
      {id:'P-2',name:'Kost Kedua',occupied_rooms:1,total_rooms:2,paid_this_month_idr:'0',unpaid_bills_idr:'1000000'}]);
    expect(result.unassigned_bills).toBe(1);
    expect(JSON.stringify(result)).not.toMatch(/Private Name|08123|B1/);
  });
  it('menandai contoh dan melepas label setelah data contoh diganti',()=>{
    const example=data();example.properties[0]={id:'PROP-1',name:'CHARISNA KOST Pusat'};
    expect(isExampleKostData(example)).toBe(true);
    expect(buildKostSnapshot(example).is_demo).toBe(true);
    expect(buildKostSnapshot({...data(),meta:{exampleData:true}}).is_demo).toBe(false);
  });
  it('menolak nominal tidak valid',()=>{
    const invalid=data();invalid.bills[0].amount=-1;
    expect(()=>buildKostSnapshot(invalid,new Date('2026-11-07'))).toThrow(/Nominal/);
  });
});
