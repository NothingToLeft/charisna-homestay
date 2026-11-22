import {describe,it,expect} from 'vitest';
import vm from 'node:vm';
import fs from 'node:fs';
const context=vm.createContext({TextEncoder});
vm.runInContext(fs.readFileSync('public/qris.js','utf8'),context);
const api=context.CharisnaQRIS;
const field=(id,value)=>id+String(value.length).padStart(2,'0')+value;
const body=[['00','01'],['01','11'],['26','0006ID.QA1'],['52','0000'],['53','360'],['58','ID'],['59','QA MERCHANT'],['60','JAKARTA']].map(([id,value])=>field(id,value)).join('')+'6304';
const source=body+api.crc(body);
describe('merchant QRIS amount',()=>{
 it('keeps merchant data and produces a valid amount and CRC',()=>{
  const output=api.amountPayload(source,1250000);
  const parsed=api.parse(output).values;
  expect(parsed['01']).toBe('12');expect(parsed['54']).toBe('1250000');
  expect(parsed['26']).toBe('0006ID.QA1');expect(parsed['59']).toBe('QA MERCHANT');
 });
 it('round trips an actual QR bitmap through the scanner',()=>{
  const box=vm.createContext({TextEncoder,Uint8ClampedArray});
  vm.runInContext(fs.readFileSync('public/vendor/qrcode.js','utf8'),box);
  vm.runInContext(fs.readFileSync('public/vendor/jsQR.js','utf8'),box);
  const payload=api.amountPayload(source,123456);
  const qr=box.qrcode(0,'M');qr.addData(payload);qr.make();
  const scale=5,margin=4,size=(qr.getModuleCount()+margin*2)*scale;
  const pixels=new Uint8ClampedArray(size*size*4).fill(255);
  for(let row=0;row<qr.getModuleCount();row++)for(let col=0;col<qr.getModuleCount();col++)if(qr.isDark(row,col)){
   for(let y=0;y<scale;y++)for(let x=0;x<scale;x++){
    const offset=(((row+margin)*scale+y)*size+(col+margin)*scale+x)*4;
    pixels[offset]=pixels[offset+1]=pixels[offset+2]=0;
   }
  }
  expect(box.jsQR(pixels,size,size).data).toBe(payload);
 });
 it('rejects damaged payloads, invalid amounts and existing dynamic codes',()=>{
  expect(()=>api.amountPayload(source.slice(0,-1)+'X',1)).toThrow();
  for(const amount of [0,-1,1.5,NaN,Infinity]) expect(()=>api.amountPayload(source,amount)).toThrow();
  expect(()=>api.amountPayload(api.amountPayload(source,1),2)).toThrow();
 });
});
