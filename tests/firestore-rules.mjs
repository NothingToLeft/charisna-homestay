import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';

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
  await assertFails(updateDoc(doc(staff, 'users/owner/cleaningTasks/task'), { status: 'DONE', checkedItems: ['Floor', 'Floor'] }));
  await assertSucceeds(updateDoc(doc(staff, 'users/owner/cleaningTasks/task'), { status: 'DONE', checkedItems: ['Floor', 'Trash'] }));
  await assertFails(setDoc(doc(staff, 'staff/privilege'), { ownerUid: 'cleaner', role: 'CLEANER', active: true }));
  const photo = { ownerUid:'owner', taskId:'task', uploadedBy:'cleaner', status:'PENDING', mimeType:'image/jpeg', kind:'AFTER', data:'/9j/', createdAt:new Date().toISOString() };
  await assertSucceeds(setDoc(doc(staff, 'cleaningPhotos/valid-photo'), photo));
  await assertFails(setDoc(doc(outsider, 'cleaningPhotos/forged-photo'), photo));
  await assertFails(setDoc(doc(staff, 'cleaningPhotos/oversized-photo'), { ...photo, data:'a'.repeat(350001) }));
  console.log('17 Firestore permission checks passed. Synthetic emulator data only.');
} finally { await env.cleanup(); }
