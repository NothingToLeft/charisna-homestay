import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, query, where, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';

const env = await initializeTestEnvironment({ projectId: 'demo-charisna-security', firestore: {
  host: '127.0.0.1', port: 8089, rules: readFileSync('firestore.rules', 'utf8')
}});
try {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'staff', 'cleaner'), { ownerUid: 'owner', role: 'CLEANER', active: true });
    await setDoc(doc(db, 'staff', 'foreign-cleaner'), { ownerUid: 'other-owner', role: 'CLEANER', active: true });
    await setDoc(doc(db, 'users/owner/staffPins/cleaner'), { pin: '1234' });
    await setDoc(doc(db, 'users/owner/charisna/current'), { data: { synthetic: true } });
    await setDoc(doc(db, 'users/owner/cleaningTasks/task'), { assigneeUid: 'cleaner', status: 'TODO', note: '', checklist: ['Floor', 'Trash'], checkedItems: [] });
  });
  const owner = env.authenticatedContext('owner').firestore();
  const staff = env.authenticatedContext('cleaner').firestore();
  const outsider = env.authenticatedContext('other-owner').firestore();
  const anonymous = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anonymous, 'users/owner/charisna/current')));
  await assertFails(getDoc(doc(outsider, 'users/owner/charisna/current')));
  await assertFails(getDoc(doc(staff, 'users/owner/charisna/current')));
  await assertFails(getDoc(doc(staff, 'users/owner/staffPins/cleaner')));
  await assertSucceeds(getDoc(doc(owner, 'users/owner/staffPins/cleaner')));
  await assertFails(getDocs(collection(staff, 'staff')));
  await assertFails(getDoc(doc(owner, 'staff/foreign-cleaner')));
  await assertSucceeds(getDocs(query(collection(owner, 'staff'), where('ownerUid', '==', 'owner'))));
  await assertSucceeds(getDoc(doc(staff, 'staff/cleaner')));
  await assertSucceeds(getDocs(query(collection(staff, 'users/owner/cleaningTasks'), where('assigneeUid', '==', 'cleaner'))));
  await assertFails(updateDoc(doc(staff, 'users/owner/cleaningTasks/task'), { assigneeUid: 'foreign-cleaner' }));
  const cleanerTask = doc(staff, 'users/owner/cleaningTasks/task');
  await assertSucceeds(updateDoc(cleanerTask, { checkedItems: ['Floor'], updatedAt: '2026-11-22' }));
  await assertFails(updateDoc(cleanerTask, { checkedItems: ['Invalid'] }));
  await assertFails(updateDoc(cleanerTask, { note: 'Unexpected TODO edit' }));
  await assertFails(updateDoc(doc(staff, 'users/owner/cleaningTasks/task'), { status: 'DONE', checkedItems: ['Floor', 'Floor'] }));
  await assertSucceeds(updateDoc(doc(staff, 'users/owner/cleaningTasks/task'), { status: 'DONE', checkedItems: ['Floor', 'Trash'] }));
  await assertFails(setDoc(doc(staff, 'staff/privilege'), { ownerUid: 'cleaner', role: 'CLEANER', active: true }));
  const photo = { ownerUid:'owner', taskId:'task', uploadedBy:'cleaner', status:'PENDING', mimeType:'image/jpeg', kind:'AFTER', data:'/9j/', createdAt:new Date().toISOString() };
  await assertSucceeds(setDoc(doc(staff, 'cleaningPhotos/valid-photo'), photo));
  await assertFails(setDoc(doc(outsider, 'cleaningPhotos/forged-photo'), photo));
  await assertFails(setDoc(doc(staff, 'cleaningPhotos/oversized-photo'), { ...photo, data:'a'.repeat(350001) }));
  const photos = collection(staff, 'cleaningPhotos');
  await assertFails(getDocs(query(photos, where('uploadedBy', '==', 'cleaner'))));
  const scopedPhotos = await assertSucceeds(getDocs(query(photos, where('ownerUid', '==', 'owner'), where('uploadedBy', '==', 'cleaner'))));
  if (!scopedPhotos.docs.some(photoDoc => photoDoc.id === 'valid-photo')) throw new Error('Assigned photo missing');
  await assertFails(getDocs(query(photos, where('ownerUid', '==', 'another-owner'), where('uploadedBy', '==', 'cleaner'))));
  const token = 'a'.repeat(64);
  await assertSucceeds(setDoc(doc(owner, 'tenantPortals', token), {ownerUid:'owner',snapshot:{name:'Synthetic'},expiresAt:new Date(Date.now()+86400000)}));
  await assertSucceeds(getDoc(doc(anonymous, 'tenantPortals', token)));
  await assertFails(getDocs(collection(anonymous, 'tenantPortals')));
  await assertFails(setDoc(doc(outsider, 'tenantPortals', token), {ownerUid:'other-owner',snapshot:{},expiresAt:new Date(Date.now()+86400000)}));
  const submission = {token,ownerUid:'owner',kind:'COMPLAINT',message:'Synthetic report',image:'',createdAt:serverTimestamp()};
  await assertSucceeds(setDoc(doc(anonymous,'tenantSubmissions','test'),submission));
  await assertFails(getDoc(doc(anonymous,'tenantSubmissions','test')));
  await assertFails(getDoc(doc(outsider,'tenantSubmissions','test')));
  await assertSucceeds(getDocs(query(collection(owner,'tenantSubmissions'),where('ownerUid','==','owner'))));
  await assertFails(setDoc(doc(anonymous,'tenantSubmissions','forged'),{...submission,ownerUid:'other-owner'}));
  await assertSucceeds(deleteDoc(doc(owner,'tenantPortals',token)));
  await assertFails(setDoc(doc(anonymous,'tenantSubmissions','revoked'),submission));
  await assertSucceeds(setDoc(doc(owner,'moneyFeeds',token),{ownerUid:'owner',month:'2026-11',properties:[],expiresAt:new Date(Date.now()+86400000)}));
  await assertSucceeds(getDoc(doc(anonymous,'moneyFeeds',token)));
  await assertFails(getDocs(collection(anonymous,'moneyFeeds')));
  await assertFails(setDoc(doc(outsider,'moneyFeeds',token),{ownerUid:'other-owner',properties:[],expiresAt:new Date(Date.now()+86400000)}));
  await assertSucceeds(deleteDoc(doc(owner,'moneyFeeds',token)));
  await assertFails(getDoc(doc(anonymous,'moneyFeeds',token)));
  console.log('40 Firestore permission checks passed. Synthetic emulator data only.');
} finally { await env.cleanup(); }
