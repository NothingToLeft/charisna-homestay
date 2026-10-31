// Runs as charisna.homestay@gmail.com. Never publish as a public web app.
const PROJECT_ID = 'charisna-kost-manager';
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const MAIL_TO = 'charisna.homestay@gmail.com';
const LABEL_NAME = 'CHARISNA KOST/Kebersihan';

function installCharisnaTriggers() {
  folder(DriveApp.getRootFolder(), 'CHARISNA KOST');
  for (const trigger of ScriptApp.getProjectTriggers()) {
    if (trigger.getHandlerFunction() === 'syncCleaningPhotos') ScriptApp.deleteTrigger(trigger);
  }
  ScriptApp.newTrigger('syncCleaningPhotos').timeBased().everyMinutes(15).create();
  syncCleaningPhotos();
}

function firestoreRequest(url, options) {
  const response = UrlFetchApp.fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}`, ...(options.headers || {}) },
    muteHttpExceptions: true
  });
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error(`Firestore ${response.getResponseCode()}: ${response.getContentText().slice(0, 300)}`);
  }
  return JSON.parse(response.getContentText());
}

function field(document, name) { return document.fields?.[name]?.stringValue || ''; }
function getDocument(path) { return firestoreRequest(`${FIRESTORE}/${path}`, { method: 'get' }); }
function folder(parent, name) {
  const safe = String(name || 'Tanpa Nama').replace(/[\\/:*?"<>|\r\n]/g, '-').slice(0, 80);
  const found = parent.getFoldersByName(safe);
  return found.hasNext() ? found.next() : parent.createFolder(safe);
}

function pendingPhotos() {
  const query = { structuredQuery: {
    from: [{ collectionId: 'cleaningPhotos' }],
    where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'PENDING' } } },
    limit: 25
  } };
  return firestoreRequest(`${FIRESTORE}:runQuery`, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(query)
  }).map((result) => result.document).filter(Boolean);
}

function markSaved(photo, driveFile) {
  const fields = ['status', 'data', 'driveUrl', 'fileId', 'syncedAt'];
  const mask = fields.map((name) => `updateMask.fieldPaths=${encodeURIComponent(name)}`).join('&');
  firestoreRequest(`https://firestore.googleapis.com/v1/${photo.name}?${mask}`, {
    method: 'patch', contentType: 'application/json', payload: JSON.stringify({ fields: {
      status: { stringValue: 'SAVED' },
      driveUrl: { stringValue: driveFile.getUrl() },
      fileId: { stringValue: driveFile.getId() },
      syncedAt: { timestampValue: new Date().toISOString() }
    } })
  });
}

function syncCleaningPhotos() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  const completed = [];
  try {
    for (const photo of pendingPhotos()) {
      try {
        const ownerUid = field(photo, 'ownerUid');
        const taskId = field(photo, 'taskId');
        const staffUid = field(photo, 'uploadedBy');
        const photoId = photo.name.split('/').pop();
        if (!/^[A-Za-z0-9_-]{10,80}$/.test(photoId) || !ownerUid || !taskId || !staffUid) throw new Error('Metadata foto tidak valid');
        const task = getDocument(`users/${encodeURIComponent(ownerUid)}/cleaningTasks/${encodeURIComponent(taskId)}`);
        const staff = getDocument(`staff/${encodeURIComponent(staffUid)}`);
        if (field(task, 'assigneeUid') !== staffUid || field(staff, 'ownerUid') !== ownerUid || staff.fields?.active?.booleanValue !== true) throw new Error('Penugasan tidak aktif');
        const raw = Utilities.base64Decode(field(photo, 'data'));
        if (raw.length < 3 || raw.length > 270000 || (raw[0] & 255) !== 255 || (raw[1] & 255) !== 216 || (raw[2] & 255) !== 255) throw new Error('File bukan JPEG yang valid');
        const date = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
        const root = folder(DriveApp.getRootFolder(), 'CHARISNA KOST');
        const destination = folder(folder(folder(folder(root, 'Kebersihan'), date), field(task, 'property')), field(staff, 'username') || staffUid);
        const filename = `${taskId}_${field(photo, 'kind')}_${photoId}.jpg`;
        const existing = destination.getFilesByName(filename);
        const file = existing.hasNext() ? existing.next() : destination.createFile(Utilities.newBlob(raw, 'image/jpeg', filename));
        markSaved(photo, file);
        completed.push(`${field(task, 'title')} | ${field(task, 'property')} | ${field(staff, 'name')} | ${field(photo, 'kind')}\n${file.getUrl()}`);
      } catch (error) {
        console.error(`Foto ${photo.name}: ${error.message}`);
      }
    }
    if (completed.length) {
      const subject = `[CHARISNA KOST] ${completed.length} foto kebersihan ${Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm')}`;
      GmailApp.sendEmail(MAIL_TO, subject, `Foto sudah masuk ke Google Drive:\n\n${completed.join('\n\n')}`);
    }
    const label = GmailApp.getUserLabelByName(LABEL_NAME) || GmailApp.createLabel(LABEL_NAME);
    for (const thread of GmailApp.search('subject:"[CHARISNA KOST]" newer_than:7d', 0, 50)) label.addToThread(thread);
  } finally { lock.releaseLock(); }
}
