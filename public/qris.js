(function(root) {
  function crc(text) {
    let result = 0xffff;
    for (const byte of new TextEncoder().encode(text)) {
      result ^= byte << 8;
      for (let bit = 0; bit < 8; bit++) result = ((result << 1) ^ ((result & 0x8000) ? 0x1021 : 0)) & 0xffff;
    }
    return result.toString(16).toUpperCase().padStart(4,'0');
  }
  function parse(payload) {
    if (typeof payload !== 'string' || payload.length > 4096 || !/^[\x20-\x7e]+$/.test(payload)) throw Error('Payload QRIS tidak valid.');
    const fields = []; const seen = new Set();
    for (let offset=0; offset<payload.length;) {
      const header=payload.slice(offset,offset+4);
      if (!/^\d{4}$/.test(header)) throw Error('Format QRIS rusak.');
      const id=header.slice(0,2), length=Number(header.slice(2));
      const value=payload.slice(offset+4,offset+4+length);
      if (value.length !== length || seen.has(id)) throw Error('Field QRIS rusak atau ganda.');
      fields.push({id,value}); seen.add(id); offset+=4+length;
    }
    const values=Object.fromEntries(fields.map(field=>[field.id,field.value]));
    if (fields.at(-1)?.id !== '63' || values['63'] !== crc(payload.slice(0,-4))) throw Error('Checksum QRIS tidak valid.');
    if (values['00'] !== '01' || values['53'] !== '360' || values['58'] !== 'ID' || !values['59']) throw Error('Gunakan QRIS merchant Indonesia (IDR).');
    if (!fields.some(field=>Number(field.id)>=26 && Number(field.id)<=51)) throw Error('Identitas merchant tidak ditemukan.');
    return {fields,values};
  }
  function amountPayload(payload, amount) {
    const {fields,values}=parse(payload);
    if (values['01'] !== '11') throw Error('Gunakan QRIS statis asli merchant.');
    if (['54','55','56','57'].some(id=>values[id] !== undefined)) throw Error('QRIS bernominal atau berbiaya khusus memerlukan penyedia merchant.');
    if (!Number.isSafeInteger(amount) || amount <= 0 || String(amount).length > 13) throw Error('Nominal tagihan tidak valid.');
    const output=fields.filter(field=>field.id !== '63').map(field=>field.id === '01' ? {id:'01',value:'12'} : field);
    const position=output.findIndex(field=>Number(field.id)>54);
    output.splice(position < 0 ? output.length : position,0,{id:'54',value:String(amount)});
    const text=output.map(field=>field.id+String(field.value.length).padStart(2,'0')+field.value).join('')+'6304';
    return text+crc(text);
  }
  function image(payload,amount) {
    const qr=root.qrcode(0,'M'); qr.addData(amountPayload(payload,amount)); qr.make();
    return qr.createDataURL(5,20);
  }
  root.CharisnaQRIS={crc,parse,amountPayload,image};
})(globalThis);
