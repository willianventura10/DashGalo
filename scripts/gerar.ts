// Converte dados-brutos/posts.json em public/data/*.json (provisório).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const posts = JSON.parse(await readFile('dados-brutos/posts.json', 'utf8'));
await mkdir('public/data', { recursive: true });
await writeFile('public/data/partidas.json', JSON.stringify({ total: posts.length }));
console.log(posts.length);
