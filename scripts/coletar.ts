// Baixa todas as fichas do blog "O Canto do Galo" pelo feed do Blogger
// (versão JSON do feed Atom) e grava os posts brutos em dados-brutos/posts.json.
// Roda no GitHub Actions: o sandbox de desenvolvimento não acessa o blog.
import { mkdir, writeFile } from 'node:fs/promises';

const FEED = 'https://galopedia.blogspot.com/feeds/posts/default';
const POR_PAGINA = 150;
const SAIDA = 'dados-brutos/posts.json';

export interface PostBruto {
  id: string;
  titulo: string;
  publicado: string;
  atualizado: string;
  url: string;
  rotulos: string[];
  html: string;
}

interface EntradaFeed {
  id: { $t: string };
  title: { $t: string };
  published: { $t: string };
  updated: { $t: string };
  category?: { term: string }[];
  link: { rel: string; href: string }[];
  content?: { $t: string };
}

/** Remove imagens e atributos de estilo: não são usados e incham o arquivo. */
function limparHtml(html: string): string {
  return html
    .replace(/<a\b[^>]*>\s*<img\b[^>]*>\s*<\/a>/gi, '')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/\s(?:style|class|border|height|width|data-[\w-]+)="[^"]*"/gi, '');
}

async function baixar(url: string, tentativas = 4): Promise<unknown> {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'DashGalo (github.com/willianventura10/DashGalo)' } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (i >= tentativas) throw e;
      await new Promise((ok) => setTimeout(ok, 2000 * i));
    }
  }
}

async function main() {
  const posts: PostBruto[] = [];
  let total = Infinity;
  for (let inicio = 1; inicio <= total; inicio += POR_PAGINA) {
    const j = (await baixar(`${FEED}?alt=json&start-index=${inicio}&max-results=${POR_PAGINA}`)) as {
      feed: { entry?: EntradaFeed[]; openSearch$totalResults: { $t: string } };
    };
    total = Number(j.feed.openSearch$totalResults.$t);
    const entradas = j.feed.entry ?? [];
    if (!entradas.length) break;
    for (const e of entradas) {
      posts.push({
        id: e.id.$t.replace(/.*post-/, ''),
        titulo: e.title.$t,
        publicado: e.published.$t,
        atualizado: e.updated.$t,
        url: e.link.find((l) => l.rel === 'alternate')?.href ?? '',
        rotulos: (e.category ?? []).map((c) => c.term).sort(),
        html: limparHtml(e.content?.$t ?? ''),
      });
    }
    console.log(`${posts.length}/${total}`);
  }
  if (posts.length < total * 0.98) throw new Error(`Coleta incompleta: ${posts.length} de ${total}`);
  posts.sort((a, b) => a.id.localeCompare(b.id));
  await mkdir('dados-brutos', { recursive: true });
  // Um post por linha: diffs legíveis no git.
  await writeFile(SAIDA, '[\n' + posts.map((p) => JSON.stringify(p)).join(',\n') + '\n]\n');
  console.log(`Gravado ${SAIDA}: ${posts.length} posts`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
