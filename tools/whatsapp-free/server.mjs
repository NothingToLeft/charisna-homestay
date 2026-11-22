import http from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import wa from 'whatsapp-web.js';
import QRCode from 'qrcode';
import {findBrowser, startupErrorMessage} from './browser-path.mjs';
import {createStartupProgress} from './startup-progress.mjs';
const dir=path.join(os.homedir(),'.charisna-kost-whatsapp');
fs.mkdirSync(dir,{recursive:true});
const configPath=path.join(dir,'config.json');
const config=fs.existsSync(configPath)?JSON.parse(fs.readFileSync(configPath,'utf8')):{token:randomBytes(32).toString('hex')};
if(!fs.existsSync(configPath))fs.writeFileSync(configPath,JSON.stringify(config),{mode:0o600});
const jobsPath=path.join(dir,'jobs.json');
const jobs=fs.existsSync(jobsPath)?JSON.parse(fs.readFileSync(jobsPath,'utf8')):{};
for(const job of Object.values(jobs))if(job.status==='SENDING')job.status='UNCERTAIN';
const persist=()=>{fs.writeFileSync(jobsPath+'.tmp',JSON.stringify(jobs));fs.renameSync(jobsPath+'.tmp',jobsPath);};
let ready=false,qrImage='',busy=false;
let client = null;
let startupStatus = 'STARTING';
let startupError = '';
let startupMessage = 'Menyiapkan browser WhatsApp.';
let startupProgress;
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
async function initializeWhatsApp() {
  startupProgress = createStartupProgress(state => {
    startupStatus = state.status;
    startupMessage = state.message;
    startupError = state.error;
    console.log(state.error || state.message);
  });
  let browserProgress;
  try {
    const browser = findBrowser();
    console.log('Browser pendamping: ' + browser);
    const visible = process.env.CHARISNA_WHATSAPP_VISIBLE === '1';
    if (visible) console.log('Mode diagnosis: browser WhatsApp ditampilkan. Jangan tutup jendelanya selama pendamping berjalan.');
    startupProgress.update('STARTING', 'Menjalankan browser pendamping.');
    client = new wa.Client({authTimeoutMs:60000,authStrategy:new wa.LocalAuth({dataPath:path.join(dir,'session')}),webVersionCache:{type:'local',path:path.join(dir,'web-cache')},puppeteer:{headless:!visible,executablePath:browser,timeout:60000}});
    browserProgress = setInterval(() => {
      if (startupStatus === 'STARTING' && client.pupPage) startupProgress.update('LOADING', 'Browser terbuka; memuat WhatsApp Web.');
    }, 1000);
    browserProgress.unref();
    client.on('loading_screen', percent => {
      const value = Number(percent);
      startupProgress.update('LOADING', 'Memuat WhatsApp Web' + (Number.isFinite(value) ? ': ' + value + '%' : '.') );
    });
    client.on('authenticated', () => {
      qrImage = '';
      startupProgress.update('AUTHENTICATED', 'Sesi dikenali; menunggu WhatsApp siap.');
      startupProgress.start();
    });
    client.on('qr',async qr=>{
      try {qrImage=await QRCode.toDataURL(qr);startupProgress.update('WAITING_QR', 'QR siap. Scan melalui WhatsApp HP → Perangkat tertaut.');}
      catch(error){startupProgress.update('FAILED', 'QR gagal dibuat.', startupErrorMessage(error));}
    });
    client.on('ready',()=>{ready=true;qrImage='';startupProgress.update('READY', 'WhatsApp terhubung.');});
    client.on('disconnected',()=>{ready=false;qrImage='';startupProgress.update('DISCONNECTED', 'WhatsApp terputus.', 'WhatsApp terputus. Periksa perangkat tertaut dan jalankan ulang pendamping.');});
    client.on('auth_failure',()=>{ready=false;qrImage='';startupProgress.update('FAILED', 'Sesi ditolak.', 'Sesi WhatsApp ditolak. Periksa Perangkat tertaut di HP, lalu jalankan ulang pendamping.');});
    await client.initialize();
  } catch(error) {
    ready=false;startupProgress.update('FAILED', 'Persiapan gagal.', startupErrorMessage(error));
  } finally {
    clearInterval(browserProgress);
  }
}
const origins=new Set(['https://nothingtoleft.github.io','https://localhost','http://localhost','capacitor://localhost','http://127.0.0.1:8772']);
function authorized(req){const supplied=Buffer.from((req.headers.authorization||'').replace(/^Bearer /,''));const expected=Buffer.from(config.token);return supplied.length===expected.length&&timingSafeEqual(supplied,expected);}
async function processJob(id,phones,message){
 busy=true;
 try{
  for(const phone of phones){
   if(!ready)throw Error('WhatsApp terputus.');
   const target=await client.getNumberId(phone);
   if(!target)throw Error('Nomor belum tersedia di WhatsApp.');
   await client.sendMessage(target._serialized,message);
   jobs[id].sent++;persist();
   await new Promise(resolve=>setTimeout(resolve,10000));
  }
  jobs[id].status='DONE';
 }catch{jobs[id].status='UNCERTAIN';}
 finally{busy=false;persist();}
}
const server=http.createServer(async(req,res)=>{
 const origin=req.headers.origin;
 if(origin&&!origins.has(origin)){res.writeHead(403);res.end();return;}
 if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
 res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
 res.setHeader('Access-Control-Allow-Private-Network','true');res.setHeader('Cache-Control','no-store');
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 if(req.url==='/'&&req.method==='GET'){
  res.setHeader('Content-Type','text/html;charset=utf-8');
  res.end('<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="10"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WhatsApp CHARISNA KOST</title><h1>WhatsApp CHARISNA KOST</h1><p>'+escapeHtml(ready?'Terhubung':startupError || (qrImage?'WhatsApp → Perangkat tertaut → Tautkan perangkat, lalu scan QR berikut.':startupMessage))+'</p>'+(qrImage?'<img alt="QR login WhatsApp" src="'+qrImage+'">':'')+'<p>Salin kode penghubung ke Pengaturan KOST → WhatsApp gratis. Kode ini hanya untuk aplikasi Anda.</p><input readonly style="width:90%;padding:12px" value="'+config.token+'"><p>PC harus menyala. Periksa penerima dan pesan sebelum mengirim.</p>');return;
 }
 if(!authorized(req)){res.writeHead(401);res.end();return;}
 res.setHeader('Content-Type','application/json');
 if(req.url==='/self-test'&&req.method==='POST'){
  const id='self-test-'+new Date().toISOString().slice(0,10);
  if(!ready){res.writeHead(409);res.end(JSON.stringify({error:'WhatsApp belum siap.'}));return;}
  if(jobs[id]){res.end(JSON.stringify(jobs[id]));return;}
  jobs[id]={status:'SENDING',sent:0,total:1};persist();
  try{
   await client.sendMessage(client.info.wid._serialized,'Uji koneksi CHARISNA KOST. Pesan ini dikirim ke akun sendiri untuk memeriksa pendamping WhatsApp.');
   jobs[id]={status:'DONE',sent:1,total:1};persist();res.end(JSON.stringify(jobs[id]));
  }catch{jobs[id].status='UNCERTAIN';persist();res.writeHead(500);res.end(JSON.stringify(jobs[id]));}
  return;
 }
 if(req.url==='/health'&&req.method==='GET'){res.end(JSON.stringify({ready,busy,status:startupStatus,message:startupMessage,error:startupError}));return;}
 if(req.url?.startsWith('/jobs/')&&req.method==='GET'){const id=req.url.slice(6);res.end(JSON.stringify(jobs[id]||{status:'UNKNOWN'}));return;}
 if(req.url!=='/send'||req.method!=='POST'){res.writeHead(404);res.end('{}');return;}
 let body='';
 try{
  for await(const chunk of req){body+=chunk;if(body.length>30000)throw Error('Permintaan terlalu besar.');}
  const {id,phones,message}=JSON.parse(body);
  if(!/^[a-zA-Z0-9-]{1,80}$/.test(id)||!Array.isArray(phones)||phones.length<1||phones.length>50||phones.some(phone=>!/^62[0-9]{8,13}$/.test(phone))||typeof message!=='string'||!message.trim()||message.length>2000)throw Error('Pesan atau penerima tidak valid.');
  if(jobs[id]){res.end(JSON.stringify(jobs[id]));return;}
  if(!ready||busy){res.writeHead(409);res.end(JSON.stringify({error:'WhatsApp belum siap atau antrean sedang berjalan.'}));return;}
  jobs[id]={status:'SENDING',sent:0,total:phones.length};persist();
  void processJob(id,[...new Set(phones)],message);
  res.writeHead(202);res.end(JSON.stringify({id,...jobs[id]}));
 }catch(error){res.writeHead(400);res.end(JSON.stringify({error:error.message}));}
});
server.listen(8772,'127.0.0.1',()=>{console.log('Buka http://127.0.0.1:8772 untuk memasangkan WhatsApp.');void initializeWhatsApp();});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Port 8772 sedang dipakai. Tutup jendela pendamping sebelumnya, lalu jalankan ulang.':startupErrorMessage(error));process.exitCode=1;});

async function shutdown(){startupProgress?.stop();server.close();await client?.destroy().catch(()=>{});process.exit(0);}
process.on('SIGINT',()=>void shutdown());process.on('SIGTERM',()=>void shutdown());
