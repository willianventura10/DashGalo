// Agregações do dashboard. Funções puras sobre a lista de partidas já filtrada.
import { normalizar } from './parser/ficha';
import type { Partida } from './tipos';

export interface Filtros {
  de: number;
  ate: number;
  competicao: string; // '' = todas (exceto amistosos, se desligados)
  mando: '' | 'casa' | 'fora';
  amistosos: boolean;
  atleticoB: boolean;
}

export const filtrosPadrao = (anos: [number, number]): Filtros => ({
  de: anos[0],
  ate: anos[1],
  competicao: '',
  mando: '',
  amistosos: false,
  atleticoB: false,
});

export function aplicarFiltros(ps: Partida[], f: Filtros): Partida[] {
  return ps.filter(
    (p) =>
      p.ano >= f.de &&
      p.ano <= f.ate &&
      (f.competicao ? p.competicao === f.competicao : f.amistosos || !p.amistoso) &&
      (f.atleticoB || !p.atleticoB) &&
      (!f.mando || p.mando === f.mando),
  );
}

export const realizadas = (ps: Partida[]) => ps.filter((p) => p.resultado !== null);

export interface Resumo {
  j: number;
  v: number;
  e: number;
  d: number;
  gp: number;
  gc: number;
  /** Pontos conquistados / disputados, vitória = 3 pontos. Fração 0–1. */
  aprov: number;
}

export function resumo(ps: Partida[]): Resumo {
  const r = { j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, aprov: 0 };
  for (const p of ps) {
    if (!p.resultado) continue;
    r.j++;
    if (p.resultado === 'V') r.v++;
    else if (p.resultado === 'E') r.e++;
    else r.d++;
    r.gp += p.golsPro ?? 0;
    r.gc += p.golsContra ?? 0;
  }
  r.aprov = r.j ? (3 * r.v + r.e) / (3 * r.j) : 0;
  return r;
}

export interface Grupo extends Resumo {
  chave: string;
  nome: string;
  primeiro: Partida;
  ultimo: Partida;
  partidas: Partida[];
}

/** Agrupa partidas realizadas. `nome` = valor mais frequente de `rotulo` no grupo. */
export function agrupar(
  ps: Partida[],
  chave: (p: Partida) => string | null,
  rotulo: (p: Partida) => string = (p) => chave(p) ?? '',
): Grupo[] {
  const m = new Map<string, Partida[]>();
  for (const p of realizadas(ps)) {
    const k = chave(p);
    if (k == null || k === '') continue;
    const l = m.get(k);
    if (l) l.push(p);
    else m.set(k, [p]);
  }
  return [...m.entries()].map(([k, l]) => {
    l.sort((a, b) => a.data.localeCompare(b.data));
    return { chave: k, nome: maisFrequente(l.map(rotulo)), primeiro: l[0], ultimo: l[l.length - 1], partidas: l, ...resumo(l) };
  });
}

function maisFrequente(xs: string[]): string {
  const c = new Map<string, number>();
  let melhor = xs[0] ?? '';
  let n = 0;
  for (const x of xs) {
    const k = (c.get(x) ?? 0) + 1;
    c.set(x, k);
    if (k > n) [melhor, n] = [x, k];
  }
  return melhor;
}

export interface Periodo extends Resumo {
  periodo: number; // ano ou início da década
}

export function porPeriodo(ps: Partida[], passo: 'ano' | 'decada'): Periodo[] {
  const m = new Map<number, Partida[]>();
  for (const p of realizadas(ps)) {
    const k = passo === 'ano' ? p.ano : Math.floor(p.ano / 10) * 10;
    m.set(k, [...(m.get(k) ?? []), p]);
  }
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([periodo, l]) => ({ periodo, ...resumo(l) }));
}

// ---------- artilheiros ----------

export interface Artilheiro {
  chave: string;
  nome: string;
  gols: number;
  penaltis: number;
  faltas: number;
  jogosComGol: number;
  de: number;
  ate: number;
}

/** Intervalo de anos acima do qual o mesmo nome é tratado como outro jogador (homônimos). */
const LACUNA_HOMONIMO = 12;

export function artilheiros(ps: Partida[]): Artilheiro[] {
  const porNome = new Map<string, { p: Partida; nome: string; tipo: string }[]>();
  for (const p of realizadas(ps)) {
    for (const g of p.gols) {
      if (g.lado !== 'A' || g.tipo === 'contra' || !g.jogador) continue;
      const k = normalizar(g.jogador);
      porNome.set(k, [...(porNome.get(k) ?? []), { p, nome: g.jogador, tipo: g.tipo }]);
    }
  }
  const lista: Artilheiro[] = [];
  for (const [k, gols] of porNome) {
    gols.sort((a, b) => a.p.data.localeCompare(b.p.data));
    let carreira: typeof gols = [];
    let n = 0;
    const fechar = () => {
      if (!carreira.length) return;
      lista.push({
        chave: `${k}#${n++}`,
        nome: maisFrequente(carreira.map((x) => x.nome)),
        gols: carreira.length,
        penaltis: carreira.filter((x) => x.tipo === 'penalti').length,
        faltas: carreira.filter((x) => x.tipo === 'falta').length,
        jogosComGol: new Set(carreira.map((x) => x.p.id)).size,
        de: carreira[0].p.ano,
        ate: carreira[carreira.length - 1].p.ano,
      });
      carreira = [];
    };
    for (const g of gols) {
      const ult = carreira[carreira.length - 1];
      if (ult && g.p.ano - ult.p.ano > LACUNA_HOMONIMO) fechar();
      carreira.push(g);
    }
    fechar();
  }
  return lista.sort((a, b) => b.gols - a.gols || a.de - b.de);
}

// ---------- sequências e goleadas ----------

export interface Sequencia {
  tamanho: number;
  inicio: Partida | null;
  fim: Partida | null;
}

export const CRITERIOS_SEQUENCIA: { id: string; nome: string; teste: (p: Partida) => boolean }[] = [
  { id: 'invicto', nome: 'Invencibilidade', teste: (p) => p.resultado !== 'D' },
  { id: 'vitorias', nome: 'Vitórias seguidas', teste: (p) => p.resultado === 'V' },
  { id: 'marcando', nome: 'Jogos seguidos marcando', teste: (p) => (p.golsPro ?? 0) > 0 },
  { id: 'semSofrer', nome: 'Jogos seguidos sem sofrer gol', teste: (p) => p.golsContra === 0 },
  { id: 'semVencer', nome: 'Jejum de vitórias', teste: (p) => p.resultado !== 'V' },
  { id: 'derrotas', nome: 'Derrotas seguidas', teste: (p) => p.resultado === 'D' },
];

/** Maior sequência e sequência atual (terminando no jogo mais recente). Partidas em ordem cronológica. */
export function sequencia(ps: Partida[], teste: (p: Partida) => boolean): { recorde: Sequencia; atual: Sequencia } {
  const jogos = realizadas(ps).filter((p) => !p.wo);
  let recorde: Sequencia = { tamanho: 0, inicio: null, fim: null };
  let atual: Sequencia = { tamanho: 0, inicio: null, fim: null };
  for (const p of jogos) {
    if (teste(p)) {
      atual = { tamanho: atual.tamanho + 1, inicio: atual.inicio ?? p, fim: p };
      if (atual.tamanho > recorde.tamanho) recorde = atual;
    } else atual = { tamanho: 0, inicio: null, fim: null };
  }
  return { recorde, atual };
}

export function goleadas(ps: Partida[], tipo: 'V' | 'D', n = 10): Partida[] {
  const saldo = (p: Partida) => (p.golsPro ?? 0) - (p.golsContra ?? 0);
  return realizadas(ps)
    .filter((p) => p.resultado === tipo && !p.wo)
    .sort((a, b) =>
      tipo === 'V'
        ? saldo(b) - saldo(a) || (b.golsPro ?? 0) - (a.golsPro ?? 0)
        : saldo(a) - saldo(b) || (b.golsContra ?? 0) - (a.golsContra ?? 0),
    )
    .slice(0, n);
}

export function topPor<T>(xs: T[], valor: (x: T) => number | null, n: number): T[] {
  return xs.filter((x) => (valor(x) ?? 0) > 0).sort((a, b) => (valor(b) ?? 0) - (valor(a) ?? 0)).slice(0, n);
}

/** Próximo jogo agendado (sem resultado), a partir de hoje. */
export function proximoJogo(ps: Partida[], hoje: string): Partida | null {
  return ps.filter((p) => p.resultado === null && p.data >= hoje).sort((a, b) => a.data.localeCompare(b.data))[0] ?? null;
}
