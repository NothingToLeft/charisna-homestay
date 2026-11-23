import {afterEach,expect,it,vi} from 'vitest';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../services/room-calendar/worker.mjs';

afterEach(()=>vi.unstubAllGlobals());

it('publishes anonymous availability, refreshes on schedule and revokes the feed',async()=>{
  const db=new DatabaseSync(':memory:');
  try{
    db.exec(readFileSync(new URL('../services/room-calendar/schema.sql',import.meta.url),'utf8'));
    const env={
      CALENDAR_ADMIN_KEY:'a'.repeat(64),CALENDAR_FEED_HOSTS:'ota.example.test',CALENDAR_APP_ORIGIN:'https://nothingtoleft.github.io',
      DB:{prepare(sql){
        const stmt=db.prepare(sql);
        const execute=(...args)=>({first:async()=>stmt.get(...args),all:async()=>({results:stmt.all(...args)}),run:async()=>stmt.run(...args)});
        return {...execute(),bind:execute};
      }}
    };
    const host='https://calendar.example.test';
    const headers={Authorization:'Bearer '+env.CALENDAR_ADMIN_KEY,Origin:env.CALENDAR_APP_ORIGIN};
    const path=host+'/rooms/example';
    expect((await worker.fetch(new Request(path),env)).status).toBe(401);
    const publish=async source=>worker.fetch(new Request(path,{method:'PUT',headers,body:JSON.stringify({source,blocks:[{start:'2026-11-22',end:'2026-11-25',name:'Private Name'}]})}),env);
    expect((await publish('https://outside.example.test/event.ics')).status).toBe(400);
    const response=await publish('https://ota.example.test/event.ics');
    expect(response.status).toBe(200);
    const {feed}=await response.json();
    const outgoing=await worker.fetch(new Request(feed),env);
    expect(outgoing.headers.get('Content-Type')).toContain('text/calendar');
    const text=await outgoing.text();
    expect(text).toContain('DTEND;VALUE=DATE:20261125');
    expect(text).not.toContain('Private Name');
    const fetch=vi.fn().mockResolvedValueOnce(new Response('BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261128\r\nDTEND;VALUE=DATE:20261129\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n')).mockRejectedValueOnce(Error('feed offline'));
    vi.stubGlobal('fetch',fetch);
    await worker.scheduled(null,env);
    let imported=await (await worker.fetch(new Request(path,{headers}),env)).json();
    expect(imported.blocks).toEqual([{start:'2026-11-28',end:'2026-11-29'}]);
    expect(fetch.mock.calls[0][1].redirect).toBe('error');
    await worker.scheduled(null,env);
    imported=await (await worker.fetch(new Request(path,{headers}),env)).json();
    expect(imported.failed).toBe(true);
    expect(imported.blocks).toHaveLength(1);
    expect((await worker.fetch(new Request(path,{method:'DELETE',headers}),env)).status).toBe(200);
    expect((await worker.fetch(new Request(feed),env)).status).toBe(404);
  }finally{db.close();}
});
