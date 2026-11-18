import { describe, expect, it } from 'vitest';
import { agrupar, aplicarFiltros, artilheiros, filtrosPadrao, goleadas, proximoJogo, resumo, sequencia } from './calc';
import type { Gol, Partida } from './tipos';

let n = 0;
function jogo(data: string, gp: number | null, gc: number | null, extra: Partial<Partida> = {}): Partida {
  const resultado = gp == null || gc == null ? null : gp > gc ? 'V' : gp < gc ? 'D' : 'E';
  return {
    id: String(n++), url: '', data, ano: Number(data.slice(0, 4)), mando: 'casa', advId: 'MG Cruzeiro', adversario: 'Cruzeiro',
    advSigla: 'MG', advPais: 'Brasil', golsPro: gp, golsContra: gc, resultado, wo: false, estadio: 'Mineirão', cidade: null, uf: null,
    competicao: 'Cmp Mineiro', competicaoNome: null, fase: null, amistoso: false, atleticoB: false, publico: null, publicoTipo: null,
    publicoEstimado: false, renda: null, arbitro: null, arbitroOrigem: null, tecnico: null, tecnicoAdv: null, gols: [], expulsoes: [],
    incompleta: false, ...extra,
  };
}
const gol = (jogador: string, extra: Partial<Gol> = {}): Gol => ({ jogador, minuto: null, tipo: 'normal', lado: 'A', ...extra });

describe('resumo', () => {
  it('conta V/E/D, gols e aproveitamento como fração (vitória = 3 pontos)', () => {
    const r = resumo([jogo('2020-01-01', 2, 0), jogo('2020-01-02', 1, 1), jogo('2020-01-03', 0, 3), jogo('2020-01-04', null, null)]);
    expect(r).toEqual({ j: 3, v: 1, e: 1, d: 1, gp: 3, gc: 4, aprov: 4 / 9 });
  });
  it('W.O. conta no resultado mas não nos gols', () => {
    const r = resumo([jogo('2020-01-01', null, null, { wo: true, resultado: 'V' })]);
    expect(r).toMatchObject({ j: 1, v: 1, gp: 0, aprov: 1 });
  });
});

describe('filtros', () => {
  const ps = [
    jogo('1950-01-01', 1, 0),
    jogo('1950-02-01', 1, 0, { amistoso: true, competicao: 'Amistoso' }),
    jogo('2017-01-01', 1, 0, { atleticoB: true }),
    jogo('2017-02-01', 1, 0, { mando: 'fora' }),
  ];
  it('padrão: sem amistosos e sem Atlético-B', () => {
    expect(aplicarFiltros(ps, filtrosPadrao([1909, 2026]))).toHaveLength(2);
  });
  it('liga amistosos e Atlético-B pelo filtro', () => {
    expect(aplicarFiltros(ps, { ...filtrosPadrao([1909, 2026]), amistosos: true, atleticoB: true })).toHaveLength(4);
  });
  it('escolher a competição "Amistoso" mostra amistosos', () => {
    expect(aplicarFiltros(ps, { ...filtrosPadrao([1909, 2026]), competicao: 'Amistoso' })).toHaveLength(1);
  });
  it('período e mando', () => {
    expect(aplicarFiltros(ps, { ...filtrosPadrao([2000, 2026]), mando: 'fora' })).toHaveLength(1);
  });
});

describe('agrupar', () => {
  it('agrupa por chave e usa o nome mais frequente', () => {
    const g = agrupar(
      [jogo('1939-01-01', 1, 0, { adversario: 'Palestra Itália' }), jogo('1950-01-01', 0, 0), jogo('1960-01-01', 2, 1)],
      (p) => p.advId,
      (p) => p.adversario,
    );
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ nome: 'Cruzeiro', j: 3, v: 2, e: 1 });
    expect(g[0].primeiro.ano).toBe(1939);
    expect(g[0].ultimo.ano).toBe(1960);
  });
});

describe('artilheiros', () => {
  it('soma gols do Atlético, ignora gol contra e do adversário, normaliza acentos', () => {
    const a = artilheiros([
      jogo('2000-01-01', 3, 1, { gols: [gol('Guilherme'), gol('Guilherme', { tipo: 'penalti' }), gol('Fulano', { tipo: 'contra' }), gol('Rival', { lado: 'D' })] }),
      jogo('2001-01-01', 1, 0, { gols: [gol('Guílherme')] }),
    ]);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ nome: 'Guilherme', gols: 3, penaltis: 1, jogosComGol: 2, de: 2000, ate: 2001 });
  });
  it('separa homônimos distantes no tempo', () => {
    const a = artilheiros([jogo('1983-01-01', 1, 0, { gols: [gol('Fred')] }), jogo('2026-01-01', 1, 0, { gols: [gol('Fred')] })]);
    expect(a.map((x) => `${x.nome} ${x.de}`)).toEqual(['Fred 1983', 'Fred 2026']);
  });
});

describe('sequências e goleadas', () => {
  const ps = [jogo('2020-01-01', 1, 0), jogo('2020-01-02', 2, 2), jogo('2020-01-03', 3, 0), jogo('2020-01-04', 0, 1), jogo('2020-01-05', 4, 0)];
  it('maior invencibilidade e sequência atual', () => {
    const s = sequencia(ps, (p) => p.resultado !== 'D');
    expect(s.recorde.tamanho).toBe(3);
    expect(s.recorde.inicio?.data).toBe('2020-01-01');
    expect(s.recorde.fim?.data).toBe('2020-01-03');
    expect(s.atual.tamanho).toBe(1);
  });
  it('goleadas ordenadas por saldo', () => {
    expect(goleadas(ps, 'V', 2).map((p) => p.data)).toEqual(['2020-01-05', '2020-01-03']);
    expect(goleadas(ps, 'D', 1)[0].data).toBe('2020-01-04');
  });
  it('próximo jogo é o primeiro sem resultado a partir de hoje', () => {
    expect(proximoJogo([...ps, jogo('2026-11-21', null, null)], '2026-11-18')?.data).toBe('2026-11-21');
    expect(proximoJogo([jogo('2020-01-01', null, null)], '2026-11-18')).toBeNull();
  });
});
