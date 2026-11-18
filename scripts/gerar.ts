// Converte dados-brutos/posts.json em public/data/partidas.json e public/data/fichas.json.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parsePost, type PostBruto } from '../src/parser/ficha';
import type { ArquivoFichas, ArquivoPartidas, Partida } from '../src/tipos';

const posts: PostBruto[] = JSON.parse(await readFile('dados-brutos/posts.json', 'utf8'));
const partidas: Partida[] = [];
const fichas: ArquivoFichas = {};
const falhas: string[] = [];
for (const post of posts) {
  const r = parsePost(post);
  if (!r) {
    falhas.push(post.titulo);
    continue;
  }
  partidas.push(r.partida);
  fichas[r.partida.id] = r.ficha;
}
partidas.sort((a, b) => a.data.localeCompare(b.data) || a.id.localeCompare(b.id));

// Nome de exibição do adversário: o mais frequente no título para o mesmo advId.
const contagem = new Map<string, Map<string, number>>();
for (const p of partidas) {
  const m = contagem.get(p.advId) ?? new Map();
  m.set(p.adversario, (m.get(p.adversario) ?? 0) + 1);
  contagem.set(p.advId, m);
}
for (const p of partidas) {
  const m = contagem.get(p.advId)!;
  p.adversario = [...m.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

const saida: ArquivoPartidas = {
  geradoEm: new Date().toISOString(),
  fonte: 'https://galopedia.blogspot.com/',
  partidas,
};
await mkdir('public/data', { recursive: true });
await writeFile('public/data/partidas.json', JSON.stringify(saida));
await writeFile('public/data/fichas.json', JSON.stringify(fichas));
console.log(`${partidas.length} partidas geradas; ${falhas.length} posts ignorados`);
for (const f of falhas) console.log('  ignorado:', f);
