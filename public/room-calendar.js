(function(root){
  function date(value){
    if(!/^\d{8}$/.test(value || ''))throw Error('Gunakan acara sehari penuh dengan tanggal mulai dan akhir.');
    const formatted=value.replace(/^(\d{4})(\d{2})(\d{2})$/,'$1-$2-$3');
    const parsed=new Date(formatted);
    if(!Number.isFinite(+parsed) || parsed.toISOString().slice(0,10)!==formatted)throw Error('Tanggal kalender tidak valid.');
    return formatted;
  }
  function parse(source){
    const lines=source.replace(/\r?\n[ \t]/g,'').trim().split(/\r?\n/);
    if(lines[0]!=='BEGIN:VCALENDAR' || lines.at(-1)!=='END:VCALENDAR')throw Error('File iCal tidak valid.');
    const blocks=[];
    let event=null;
    for(const line of lines){
      if(line==='BEGIN:VEVENT'){event={};continue;}
      if(!event)continue;
      if(line==='END:VEVENT'){
        if(event.cancelled){event=null;continue;}
        const start=date(event.start),end=date(event.end);
        if(end<=start || blocks.length>=500)throw Error('Rentang kalender terbalik atau terlalu banyak acara.');
        blocks.push({start,end});event=null;continue;
      }
      if(/^RRULE[:;]/.test(line))throw Error('Acara berulang perlu diekspor sebagai tanggal terpisah.');
      if(/^DTSTART[;:]/.test(line))event.start=line.split(':').at(-1);
      if(/^DTEND[;:]/.test(line))event.end=line.split(':').at(-1);
      if(line==='STATUS:CANCELLED')event.cancelled=true;
    }
    if(event)throw Error('Acara iCal belum lengkap.');
    return blocks;
  }
  function exportCalendar(blocks,roomId='room'){
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CHARISNA KOST//Availability//ID','CALSCALE:GREGORIAN'];
    const stamp=new Date().toISOString().replace(/[-:]|\.\d{3}/g,'');
    for(const {start,end} of blocks){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start>=end)continue;
      lines.push('BEGIN:VEVENT','UID:' + encodeURIComponent(roomId) + '-' + start + '-' + end + '@charisna-kost','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+start.replaceAll('-',''),'DTEND;VALUE=DATE:'+end.replaceAll('-',''),'SUMMARY:Unavailable','END:VEVENT');
    }
    return [...lines,'END:VCALENDAR',''].join('\r\n');
  }
  function feedUrl(value){
    const url=new URL(value);
    if(url.protocol!=='https:' || url.username || url.password || url.hash)throw Error('Gunakan URL HTTPS tanpa kredensial di alamat.');
    return url.href;
  }
  async function fetchFeed(value){
    const response=await fetch(feedUrl(value),{credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',signal:AbortSignal.timeout(12000)});
    if(!response.ok || !response.body)throw Error('Kalender tidak dapat dimuat.');
    const reader=response.body.getReader();
    let size=0, source='';
    const decoder=new TextDecoder();
    try{
      for(;;){
        const {done,value:chunk}=await reader.read();
        if(done)break;
        size+=chunk.byteLength;
        if(size>250000)throw Error('Kalender maksimal 250 KB.');
        source+=decoder.decode(chunk,{stream:true});
      }
      return parse(source+decoder.decode());
    }finally{await reader.cancel().catch(()=>{});}
  }
  root.CharisnaRoomCalendar={parse,export:exportCalendar,feedUrl,fetchFeed};
})(globalThis);
