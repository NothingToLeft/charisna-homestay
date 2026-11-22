import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
const db = getFirestore(initializeApp({apiKey:'AIzaSyCXu5b6BKVKYczMTIL8Nc-MuLvLQdiQXtI',projectId:'charisna-kost-manager',appId:'1:307208439143:web:ba437f97b3f3cee0c65bc2'}));
const status = document.getElementById('status');
try {
  const id = location.hash.slice(1);
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw Error('Tautan tidak valid.');
  const entry = await getDoc(doc(db,'publicCatalogs',id));
  if (!entry.exists()) throw Error('Katalog belum diterbitkan.');
  const data = entry.data(); document.getElementById('title').textContent = data.name;
  for (const room of data.rooms) {
    const article = document.createElement('article');
    const title=document.createElement('h2');title.textContent='Unit '+room.number;article.append(title);
    for (const text of [room.type,room.facilities]) {
      const line = document.createElement('p'); line.textContent = text; article.append(line);
    }
    const price=document.createElement('p');price.className='catalog-price';price.textContent='Rp '+Number(room.price).toLocaleString('id-ID')+' / bulan';article.append(price);
    if (/^data:image\/(png|jpeg);base64,/.test(room.image || '')) {
      const image = document.createElement('img'); image.src = room.image; image.alt = 'Foto unit ' + room.number;
      image.style.maxWidth = '100%'; article.append(image);
    }
    document.querySelector('main').append(article);
  }
  status.textContent = data.rooms.length ? 'Hubungi pengelola untuk memastikan ketersediaan. Diperbarui ' + data.updatedAt.slice(0,10) : 'Belum ada kamar ditawarkan.';
} catch (error) {status.textContent = error.message;}
