(function(root){
  'use strict';
  const labels={
    receipt:['Kuitansi pembayaran','Payment receipt'],invoice:['Tagihan sewa','Rental invoice'],
    official:['Dokumen resmi','Official document'],from:['Diterima dari','Received from'],guest:['Nama tamu','Guest name'],
    room:['Unit kamar','Room'],period:['Periode sewa','Rental period'],paidDate:['Tanggal pembayaran','Payment date'],
    dueDate:['Jatuh tempo','Due date'],description:['Deskripsi','Description'],amount:['Jumlah','Amount'],
    rent:['Sewa kamar','Room rent'],electric:['Listrik & air','Electricity & water'],other:['Biaya lainnya','Other charges'],
    totalPaid:['Total dibayar','Total paid'],totalDue:['Total tagihan','Total due'],paid:['Lunas','Paid'],unpaid:['Belum lunas','Unpaid'],
    bank:['Informasi rekening','Bank details'],printed:['Diterbitkan oleh CHARISNA KOST','Issued by CHARISNA KOST'],
    signature:['Dokumen elektronik; tidak memerlukan tanda tangan basah.','Electronic document; no handwritten signature required.'],
    regards:['Hormat kami','Kind regards'],manager:['Pengelola','Management'],nights:['malam','nights'],
    reminder:['Pengingat pembayaran sewa','Rental payment reminder']
  };
  const language=value=>['id','en','both'].includes(value)?value:'id';
  const nightWord=(count,lang='id')=>language(lang)==='en'?(count===1?'night':'nights'):language(lang)==='both'?'malam / '+(count===1?'night':'nights'):'malam';
  const text=(key,lang='id')=>{const pair=labels[key];if(!pair)throw Error('Label tidak tersedia.');return language(lang)==='both'?pair.join(' / '):pair[language(lang)==='en'?1:0];};
  function money(value,lang='id'){
    if(!Number.isSafeInteger(Number(value)) || Number(value)<0)throw Error('Nominal harus berupa Rupiah bulat dan tidak negatif.');
    return (language(lang)==='en'?'IDR ':'Rp ')+Number(value).toLocaleString(language(lang)==='en'?'en-GB':'id-ID');
  }
  function dateValue(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value || ''))throw Error('Isi tanggal masuk dan check-out.');
    const time=Date.parse(value+'T00:00:00Z');
    if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==value)throw Error('Tanggal tidak valid.');
    return time;
  }
  function nights(start,end){const count=(dateValue(end)-dateValue(start))/86400000;if(!Number.isInteger(count)||count<1)throw Error('Check-out sewa harian harus setelah tanggal masuk, minimal satu malam.');return count;}
  const mode=room=>['MONTHLY','DAILY','BOTH'].includes(room?.rentalMode)?room.rentalMode:'MONTHLY';
  const shortStay=interval=>interval==='Harian' || interval==='Transit';
  const supports=(room,interval)=>mode(room)==='BOTH'||mode(room)===(shortStay(interval)?'DAILY':'MONTHLY');
  function priceNights(room,start,end){
    const count=nights(start,end), startTime=dateValue(start);
    return Array.from({length:count},(_,index)=>{
      const day=new Date(startTime+index*86400000);
      const date=day.toISOString().slice(0,10);
      const plan=room.ratePlan || {};
      const rate=plan.holidays?.includes(date) && plan.holiday ? plan.holiday :
        [0,6].includes(day.getUTCDay()) && plan.weekend ? plan.weekend : room.nightlyPrice;
      money(rate);
      if(rate<=0)throw Error('Tarif per malam harus positif.');
      return {date,rate};
    });
  }
  function quote(room,stay){
    if(!room)throw Error('Kamar tidak ditemukan.');
    if(stay.leaseInterval==='Transit'){
      dateValue(stay.entryDate);
      const time=/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/;
      if(stay.entryDate!==stay.endDate || !time.test(stay.startTime) || !time.test(stay.endTime) || stay.endTime<=stay.startTime)
        throw Error('Transit harus selesai pada tanggal yang sama dan jam keluar harus setelah jam masuk.');
      const baseAmount=Number(stay.transitRate ?? room.ratePlan?.transit);
      money(baseAmount);
      if(baseAmount<=0)throw Error('Atur tarif transit pada kamar.');
      return {rentalMode:'TRANSIT',stayStart:stay.entryDate,stayEnd:stay.endDate,startTime:stay.startTime,endTime:stay.endTime,baseAmount};
    }
    if(stay.leaseInterval!=='Harian'){
      const baseAmount=Number(room.price);money(baseAmount);
      return {rentalMode:'MONTHLY',baseAmount};
    }
    const count=nights(stay.entryDate,stay.endDate);
    if(count>366)throw Error('Sewa harian maksimal 366 malam per tagihan.');
    const saved=stay.stayRateBreakdown;
    const matches=saved?.length===count && saved[0].date===stay.entryDate &&
      dateValue(saved.at(-1).date)+86400000===dateValue(stay.endDate);
    if(stay.nightlyRate==null && (matches || stay.ratePlan)){
      const nightlyBreakdown=matches?saved:priceNights(room,stay.entryDate,stay.endDate);
      const baseAmount=nightlyBreakdown.reduce((sum,item)=>sum+item.rate,0);
      money(baseAmount);
      return {rentalMode:'DAILY',nightlyRate:nightlyBreakdown[0].rate,nightlyBreakdown,nights:count,stayStart:stay.entryDate,stayEnd:stay.endDate,baseAmount};
    }
    const rate=Number(stay.nightlyRate ?? room.nightlyPrice);
    if(!Number.isSafeInteger(rate)||rate<=0||!Number.isSafeInteger(rate*count))throw Error('Isi harga per malam berupa Rupiah bulat yang valid.');
    return {rentalMode:'DAILY',nightlyRate:rate,nights:count,stayStart:stay.entryDate,stayEnd:stay.endDate,baseAmount:rate*count};
  }
  function rateLabel(room,lang='id'){
    const daily=money(Number(room.nightlyPrice)||0,lang)+(language(lang)==='en'?' / night':' / malam');
    const monthly=money(Number(room.price)||0,lang)+(language(lang)==='en'?' / month':' / bulan');
    return mode(room)==='DAILY'?daily:mode(room)==='BOTH'?monthly+' · '+daily:monthly;
  }
  function period(bill,lang='id'){
    if(bill.rentalMode==='TRANSIT')return bill.stayStart+' · '+bill.startTime+'–'+bill.endTime;
    if(bill.rentalMode==='DAILY')return `${bill.stayStart} – ${bill.stayEnd} (${bill.nights} ${nightWord(bill.nights,lang)})`;
    if(language(lang)==='id')return bill.period || '-';
    const id=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const en=['January','February','March','April','May','June','July','August','September','October','November','December'];
    const translated=String(bill.period || '-').replace(new RegExp(id.join('|'),'gi'),month=>en[id.findIndex(item=>item.toLowerCase()===month.toLowerCase())]);
    return language(lang)==='both'&&translated!==bill.period?bill.period+' / '+translated:translated;
  }
  function charges(bill){
    const electric=Number(bill.electricAmount || 0),other=Number(bill.otherAmount || 0);
    const base=bill.baseAmount==null?Number(bill.amount || 0)-electric-other:Number(bill.baseAmount);
    for(const value of [base,electric,other,Number(bill.amount || 0)])money(value);
    return {base,electric,other};
  }
  function singleMessage(type,data,lang){
    const bill=data.bill || data;const settings=data.settings || {};const paid=type==='RECEIPT'&&bill.status==='LUNAS';
    if(type==='BOOKING_WELCOME'){
      const plans={Transit:'Day use',Harian:'Nightly',Bulanan:'Monthly','3 Bulanan':'Every 3 months','6 Bulanan':'Every 6 months',Tahunan:'Yearly'};
      const interval=lang==='en'?(plans[bill.leaseInterval] || 'Monthly'):bill.leaseInterval || 'Bulanan';
      return lang==='en'?`Welcome to ${settings.kostName || 'CHARISNA KOST'}!\n\nHello ${bill.tenantName},\nRoom: ${bill.roomNumber}\nCheck-in: ${bill.entryDate || '-'}\nCheck-out / lease end: ${bill.endDate || '-'}\nRental plan: ${interval}\nDeposit: ${money(Number(bill.deposit || 0),lang)}\n\nPlease contact management for house rules and Wi-Fi details. We hope you enjoy your stay.`:`Selamat datang di ${settings.kostName || 'CHARISNA KOST'}!\n\nHalo ${bill.tenantName},\nUnit: ${bill.roomNumber}\nTanggal masuk: ${bill.entryDate || '-'}\nCheck-out / akhir sewa: ${bill.endDate || '-'}\nMode sewa: ${interval}\nDeposit: ${money(Number(bill.deposit || 0),lang)}\n\nSilakan hubungi pengelola untuk tata tertib dan informasi Wi-Fi. Semoga nyaman tinggal bersama kami.`;
    }
    const title=type==='REMINDER'?text('reminder',lang):text(paid?'receipt':'invoice',lang);
    const amounts=charges(bill);
    const hello=lang==='en'?`Hello ${bill.tenantName},`:`Halo ${bill.tenantName},`;
    const lines=[`*${title}*`,settings.kostName || 'CHARISNA KOST','',hello,`No: ${bill.id || '-'}`,`${text('room',lang)}: ${bill.roomNumber}`,`${text('period',lang)}: ${period(bill,lang)}`];
    if(settings.kostAddress)lines.splice(2,0,settings.kostAddress);
    if(settings.ownerPhone)lines.splice(2,0,(lang==='en'?'Phone: ':'Telp. ')+settings.ownerPhone);
    if(bill.nightlyBreakdown?.length)lines.push(lang==='en'?'Nightly rates vary by date.':'Tarif per malam mengikuti tanggal.');
    else if(bill.rentalMode==='DAILY')lines.push(`${bill.nights} ${nightWord(bill.nights,lang)} × ${money(bill.nightlyRate,lang)}`);
    lines.push(`${text('rent',lang)}: ${money(amounts.base+(paid?amounts.electric:0),lang)}`);
    if(!paid && amounts.electric)lines.push(`${text('electric',lang)}: ${money(amounts.electric,lang)}`);
    if(amounts.other)lines.push(`${text('other',lang)}: ${money(amounts.other,lang)}`);
    lines.push(`*${text(paid?'totalPaid':'totalDue',lang)}: ${money(Number(bill.amount || 0),lang)}*`,`${text(paid?'paidDate':'dueDate',lang)}: ${paid?bill.paidDate || '-':bill.dueDate || '-'}`,`${text(paid?'paid':'unpaid',lang)}`);
    if(!paid){lines.push('',`${text('bank',lang)}: ${settings.bankInfo || '-'}`,lang==='en'?'Please send your payment confirmation after transferring. Thank you.':'Mohon kirim bukti pembayaran setelah transfer. Terima kasih.');}
    else {
      if(settings.bankInfo)lines.push('',text('bank',lang)+': '+settings.bankInfo);
      lines.push('',lang==='en'?'Thank you for your payment.':'Terima kasih atas pembayarannya.',text('signature',lang));
    }
    if(settings.ownerName)lines.push('',text('regards',lang)+',',settings.ownerName);
    return lines.join('\n');
  }
  function message(type,data,lang='id'){
    lang=language(lang);
    return lang==='both'?singleMessage(type,data,'id')+'\n\n──────────\n\n'+singleMessage(type,data,'en'):singleMessage(type,data,lang);
  }
  root.CharisnaRental={language,nightWord,text,money,nights,mode,shortStay,supports,quote,rateLabel,period,charges,message};
})(globalThis);
