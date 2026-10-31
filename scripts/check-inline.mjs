import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .filter((source) => source.trim());

if (!inlineScripts.length) throw new Error('Inline app script not found.');
inlineScripts.forEach((source, index) => new Script(source, { filename: `index.html:inline-${index + 1}` }));
console.log(`${inlineScripts.length} inline scripts parsed`);
