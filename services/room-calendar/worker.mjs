import '../../public/room-calendar.js';

const calendar = globalThis.CharisnaRoomCalendar;
const maxRooms = 25;
const json = (data, status = 200) => Response.json(data, {status,headers:{'Cache-Control':'no-store'}});
const roomKey = /^[a-zA-Z0-9_-]{1,100}$/;
const tokenKey = /^[a-f0-9]{64}$/;

function permittedFeed(value, env) {
  const url = new URL(calendar.feedUrl(value));
  const hosts = (env.CALENDAR_FEED_HOSTS || '').split(',').map(host => host.trim().toLowerCase());
  if (url.port || !hosts.includes(url.hostname)) throw Error('Host feed belum diizinkan.');
  return url.href;
}

async function authorized(request, env) {
  if (!tokenKey.test(env.CALENDAR_ADMIN_KEY || '')) return false;
  const supplied = request.headers.get('Authorization') || '';
  const encoder = new TextEncoder();
  const key=await crypto.subtle.importKey('raw',encoder.encode(env.CALENDAR_ADMIN_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
  const expected=await crypto.subtle.sign('HMAC',key,encoder.encode('Bearer '+env.CALENDAR_ADMIN_KEY));
  return crypto.subtle.verify('HMAC',key,expected,encoder.encode(supplied));
}

function cleanBlocks(value) {
  if (!Array.isArray(value) || value.length > 500) throw Error('Rentang kalender tidak valid.');
  return value.map(({start,end}) => {
    const date = day => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) &&
      Number.isFinite(Date.parse(day)) && new Date(day).toISOString().slice(0,10) === day;
    if (!date(start) || !date(end) || end <= start) throw Error('Rentang kalender tidak valid.');
    return {start,end};
  });
}

async function refresh(row, env) {
  try {
    const url = permittedFeed(row.source,env);
    const blocks = await calendar.fetchFeed(url,{redirect:'manual'});
    await env.DB.prepare('UPDATE calendars SET imported=?, refreshed=?, failed=0 WHERE id=? AND source=?')
      .bind(JSON.stringify(blocks),new Date().toISOString(),row.id,row.source).run();
  } catch {
    await env.DB.prepare('UPDATE calendars SET failed=1 WHERE id=? AND source=?').bind(row.id,row.source).run();
  }
}

async function route(request, env) {
  const url = new URL(request.url);
  const publicId = url.pathname.match(/^\/feed\/([a-f0-9]{64})\.ics$/)?.[1];
  if (request.method === 'GET' && publicId) {
    const row = await env.DB.prepare('SELECT local FROM calendars WHERE token=?').bind(publicId).first();
    if (!row) return new Response('Not found',{status:404});
    return new Response(calendar.export(JSON.parse(row.local),publicId),{
      headers:{'Content-Type':'text/calendar; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
    });
  }

  const id = url.pathname.split('/')[2] || '';
  if (url.pathname !== '/rooms/'+id || !roomKey.test(id)) return json({error:'Tidak ditemukan.'},404);
  if (request.method === 'OPTIONS') return new Response(null,{status:204});
  if (!await authorized(request,env)) return json({error:'Akses ditolak.'},401);

  let row = await env.DB.prepare('SELECT * FROM calendars WHERE id=?').bind(id).first();
  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM calendars WHERE id=?').bind(id).run();
    return json({ok:true});
  }
  if (request.method === 'PUT') {
    if(Number(request.headers.get('Content-Length'))>50000)return json({error:'Data kalender terlalu besar.'},413);
    const body = await request.text();
    if (body.length > 50000) return json({error:'Data kalender terlalu besar.'},413);
    const data = JSON.parse(body);
    const local = JSON.stringify(cleanBlocks(data.blocks));
    const source = data.source ? permittedFeed(data.source,env) : '';
    if (!row) {
      const token = Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('');
      await env.DB.prepare("INSERT OR IGNORE INTO calendars (id,token,source,local) SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM calendars) < ?").bind(id,token,source,local,maxRooms).run();
    } else {
      await env.DB.prepare('UPDATE calendars SET local=?, source=?, refreshed=CASE WHEN source=? THEN refreshed ELSE NULL END, failed=CASE WHEN source=? THEN failed ELSE 0 END WHERE id=?').bind(local,source,source,source,id).run();
    }
    row = await env.DB.prepare('SELECT * FROM calendars WHERE id=?').bind(id).first();
    if (!row) return json({error:'Batas 25 kalender tercapai.'},409);
  } else if (request.method === 'POST') {
    if (!row) return json({error:'Kalender belum diterbitkan.'},404);
    if (!row.source) return json({error:'Feed masuk belum diatur.'},409);
    await refresh(row,env);
    row = await env.DB.prepare('SELECT * FROM calendars WHERE id=?').bind(id).first();
  } else if (request.method !== 'GET') return json({error:'Metode tidak didukung.'},405);

  if (!row) return json({error:'Kalender belum diterbitkan.'},404);
  return json({feed:url.origin+'/feed/'+row.token+'.ics',blocks:JSON.parse(row.imported),refreshed:row.refreshed,failed:Boolean(row.failed)});
}

export default {
  async fetch(request, env) {
    const origin=request.headers.get('Origin');
    const admin=new URL(request.url).pathname.startsWith('/rooms/');
    if (admin && origin && origin!==env.CALENDAR_APP_ORIGIN) return json({error:'Origin ditolak.'},403);
    let response;
    try {response=await route(request,env);}
    catch {response=json({error:'Konfigurasi atau data kalender tidak valid.'},400);}
    if(admin && origin===env.CALENDAR_APP_ORIGIN){
      response.headers.set('Access-Control-Allow-Origin',origin);
      response.headers.set('Vary','Origin');
      response.headers.set('Access-Control-Allow-Headers','Authorization, Content-Type');
      response.headers.set('Access-Control-Allow-Methods','GET, PUT, DELETE, OPTIONS');
    }
    return response;
  },
  async scheduled(_event,env){
    const {results}=await env.DB.prepare("SELECT id,source FROM calendars WHERE source<>'' LIMIT 25").all();
    for(const row of results)await refresh(row,env);
  }
};
