import { mkdir, copyFile, writeFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await copyFile('index.html', 'dist/index.html');
await copyFile('public/cloud-sync.js', 'dist/cloud-sync.js');
await copyFile('public/roles.js', 'dist/roles.js');
await writeFile('dist/.nojekyll', '');
console.log('Charisna static web prepared in dist/');
