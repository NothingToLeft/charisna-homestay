const monthOf = date => {
  const parts = new Intl.DateTimeFormat('en-US', {timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit'}).formatToParts(date);
  return `${parts.find(part=>part.type==='year').value}-${parts.find(part=>part.type==='month').value}`;
};
const rupiah = value => {
  const number=Number(value);
  if(!Number.isSafeInteger(number)||number<0)throw Error('Nominal tagihan tidak valid.');
  return number;
};

export function isExampleKostData(data){
  return Boolean(data?.properties?.some(property=>property.id==='PROP-1'&&property.name==='CHARISNA KOST Pusat')
    ||data?.properties?.some(property=>property.id==='PROP-2'&&property.name==='CHARISNA KOST Suites')
    ||data?.rooms?.some(room=>room.id==='R101'&&room.number==='101'&&room.propertyId==='PROP-1')
    ||data?.tenants?.some(tenant=>tenant.id==='T1'&&tenant.name==='Dimas Anggara')
    ||data?.bills?.some(bill=>bill.id==='INV-101'&&bill.roomNumber==='101'));
}

export function buildKostSnapshot(data, now=new Date()){
  if(!data||!Array.isArray(data.properties)||!Array.isArray(data.rooms)||!Array.isArray(data.bills))throw Error('Data KOST belum lengkap.');
  const properties=data.properties.map(property=>{
    if(typeof property?.id!=='string'||!/^[\w-]{1,100}$/.test(property.id)||typeof property.name!=='string'||!property.name.trim()||property.name.length>100)throw Error('Identitas properti tidak valid.');
    return {id:property.id,name:property.name.trim()};
  });
  const ids=new Set(properties.map(property=>property.id));
  if(ids.size!==properties.length)throw Error('ID properti ganda.');
  const roomProperty=room=>room.propertyId||(ids.has('PROP-1')?'PROP-1':properties.length===1?properties[0].id:null);
  const matchingProperty=bill=>{
    if(bill.propertyId)return ids.has(bill.propertyId)?bill.propertyId:null;
    const matches=data.rooms.filter(room=>room.number===bill.roomNumber&&ids.has(roomProperty(room)));
    return matches.length===1?roomProperty(matches[0]):null;
  };
  const month=monthOf(now);
  const summary=properties.map(property=>{
    const rooms=data.rooms.filter(room=>roomProperty(room)===property.id);
    const bills=data.bills.filter(bill=>matchingProperty(bill)===property.id);
    const paid=bills.filter(bill=>bill.status==='LUNAS'&&typeof bill.paidDate==='string'&&bill.paidDate.startsWith(month));
    const unpaid=bills.filter(bill=>bill.status==='BELUM_LUNAS');
    const paidTotal=paid.reduce((sum,bill)=>sum+rupiah(bill.amount),0);
    const unpaidTotal=unpaid.reduce((sum,bill)=>sum+rupiah(bill.amount),0);
    if(!Number.isSafeInteger(paidTotal)||!Number.isSafeInteger(unpaidTotal))throw Error('Jumlah tagihan terlalu besar.');
    return {id:property.id,name:property.name,occupied_rooms:rooms.filter(room=>room.status==='TERISI').length,total_rooms:rooms.length,
      paid_this_month_idr:String(paidTotal),unpaid_bills_idr:String(unpaidTotal)};
  });
  const unassigned_bills=data.bills.filter(bill=>!matchingProperty(bill)).length;
  return {schema:1,month,source:'local_snapshot',is_demo:isExampleKostData(data),properties:summary,unassigned_bills};
}
