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
  const supports=(room,interval)=>mode(room)==='BOTH'||mode(room)===(interval==='Harian'?'DAILY':'MONTHLY');
  function quote(room,stay){
    if(!room)throw Error('Kamar tidak ditemukan.');
    if(stay.leaseInterval!=='Harian'){
      const baseAmount=Number(room.price);money(baseAmount);
      return {rentalMode:'MONTHLY',baseAmount};
    }
    const count=nights(stay.entryDate,stay.endDate),rate=Number(stay.nightlyRate ?? room.nightlyPrice);
    if(!Number.isSafeInteger(rate)||rate<=0||!Number.isSafeInteger(rate*count))throw Error('Isi harga per malam berupa Rupiah bulat yang valid.');
    return {rentalMode:'DAILY',nightlyRate:rate,nights:count,stayStart:stay.entryDate,stayEnd:stay.endDate,baseAmount:rate*count};
  }
  function rateLabel(room,lang='id'){
    const daily=money(Number(room.nightlyPrice)||0,lang)+(language(lang)==='en'?' / night':' / malam');
    const monthly=money(Number(room.price)||0,lang)+(language(lang)==='en'?' / month':' / bulan');
    return mode(room)==='DAILY'?daily:mode(room)==='BOTH'?monthly+' · '+daily:monthly;
  }
  function period(bill,lang='id'){
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
      const plans={Harian:'Nightly',Bulanan:'Monthly','3 Bulanan':'Every 3 months','6 Bulanan':'Every 6 months',Tahunan:'Yearly'};
      const interval=lang==='en'?(plans[bill.leaseInterval] || 'Monthly'):bill.leaseInterval || 'Bulanan';
      return lang==='en'?`Welcome to ${settings.kostName || 'CHARISNA KOST'}!\n\nHello ${bill.tenantName},\nRoom: ${bill.roomNumber}\nCheck-in: ${bill.entryDate || '-'}\nCheck-out / lease end: ${bill.endDate || '-'}\nRental plan: ${interval}\nDeposit: ${money(Number(bill.deposit || 0),lang)}\n\nPlease contact management for house rules and Wi-Fi details. We hope you enjoy your stay.`:`Selamat datang di ${settings.kostName || 'CHARISNA KOST'}!\n\nHalo ${bill.tenantName},\nUnit: ${bill.roomNumber}\nTanggal masuk: ${bill.entryDate || '-'}\nCheck-out / akhir sewa: ${bill.endDate || '-'}\nMode sewa: ${interval}\nDeposit: ${money(Number(bill.deposit || 0),lang)}\n\nSilakan hubungi pengelola untuk tata tertib dan informasi Wi-Fi. Semoga nyaman tinggal bersama kami.`;
    }
    const title=type==='REMINDER'?text('reminder',lang):text(paid?'receipt':'invoice',lang);
    const amounts=charges(bill);
    const hello=lang==='en'?`Hello ${bill.tenantName},`:`Halo ${bill.tenantName},`;
    const lines=[`*${title}*`,settings.kostName || 'CHARISNA KOST','',hello,`No: ${bill.id || '-'}`,`${text('room',lang)}: ${bill.roomNumber}`,`${text('period',lang)}: ${period(bill,lang)}`];
    if(settings.kostAddress)lines.splice(2,0,settings.kostAddress);
    if(settings.ownerPhone)lines.splice(2,0,(lang==='en'?'Phone: ':'Telp. ')+settings.ownerPhone);
    if(bill.rentalMode==='DAILY')lines.push(`${bill.nights} ${nightWord(bill.nights,lang)} × ${money(bill.nightlyRate,lang)}`);
    lines.push(`${text('rent',lang)}: ${money(amounts.base,lang)}`);
    if(amounts.electric)lines.push(`${text('electric',lang)}: ${money(amounts.electric,lang)}`);
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
  root.CharisnaRental={language,nightWord,text,money,nights,mode,supports,quote,rateLabel,period,charges,message};
})(globalThis);
