import {describe,it,expect} from 'vitest';
import '../public/room-calendar.js';
const {parse}=globalThis.CharisnaRoomCalendar;
describe('room availability file',()=>{
  const calendar=event=>'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\n'+event+'\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
  it('imports all-day blocks without guest details',()=>{
    expect(parse(calendar('DTSTART;VALUE=DATE:20261122\r\nDTEND;VALUE=DATE:20261125\r\nSUMMARY:Private guest'))).toEqual([{start:'2026-11-22',end:'2026-11-25'}]);
  });
  it('rejects unsupported timed events instead of silently opening availability',()=>{
    expect(()=>parse(calendar('DTSTART:20261122T140000Z\r\nDTEND:20261125T120000Z'))).toThrow();
  });
});
