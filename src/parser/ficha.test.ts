import { describe, expect, it } from 'vitest';
import posts from './__fixtures__/posts.json';
import { dividirLista, parseGols, parsePost, parsePublico, parseRenda, parseTitulo, type PostBruto } from './ficha';

const porTitulo = (inicio: string) => {
  const p = (posts as PostBruto[]).find((x) => x.titulo.startsWith(inicio));
  if (!p) throw new Error(`fixture ausente: ${inicio}`);
  const r = parsePost(p);
  if (!r) throw new Error(`não parseou: ${inicio}`);
  return r;
};
const gols = (r: ReturnType<typeof porTitulo>) => r.partida.gols.map((g) => `${g.jogador}|${g.minuto}|${g.tipo}|${g.lado}`);

describe('título', () => {
  it('lê data, lados, sigla e placar', () => {
    expect(parseTitulo('07/11/2026 - Atlético MG 1x1 Grêmio RS')).toEqual({
      data: '2026-11-07',
      mandante: { nome: 'Atlético', sigla: 'MG' },
      visitante: { nome: 'Grêmio', sigla: 'RS' },
      placar: [1, 1],
      wo: null,
    });
  });
  it('aceita travessão, placar com erro e jogo sem placar', () => {
    expect(parseTitulo('26/04/2015 – Atlético MG 0x0 Caldense MG')?.placar).toEqual([0, 0]);
    expect(parseTitulo('05/09/1915 - Atlético MG 0-x1 Christovam Colombo MG')?.placar).toEqual([0, 1]);
    expect(parseTitulo('21/11/2026 - Boca Juniors ARG x Atlético MG')?.placar).toBeNull();
  });
  it('W-O: o W fica do lado do vencedor', () => {
    expect(parseTitulo('11/12/2016 - Chapecoense SC W-O Atlético MG')?.wo).toBe('mandante');
    expect(parseTitulo('02/12/1928 – Palmeiras/BH MG O-W Atlético MG')?.wo).toBe('visitante');
  });
});

describe('campos isolados', () => {
  it('público', () => {
    expect(parsePublico('42.922 pagantes')).toEqual({ publico: 42922, publicoTipo: 'pagantes', publicoEstimado: false });
    expect(parsePublico('3.000 presentes (estimado) .')).toEqual({ publico: 3000, publicoTipo: 'presentes', publicoEstimado: true });
    expect(parsePublico('? pagantes').publico).toBeNull();
    expect(parsePublico('Portões abertos').publico).toBeNull();
  });
  it('renda em centavos, por moeda', () => {
    expect(parseRenda('R$ 5.457.622,94.')).toEqual({ moeda: 'R$', centavos: 545762294 });
    expect(parseRenda('Cr$ 65.480.000,00.')).toEqual({ moeda: 'Cr$', centavos: 6548000000 });
    expect(parseRenda('NCr$ 12.345,00')).toEqual({ moeda: 'NCr$', centavos: 1234500 });
    expect(parseRenda('7:000$000')).toEqual({ moeda: 'Rs', centavos: 700000000 });
    expect(parseRenda('$ ')).toBeNull();
    expect(parseRenda('Não divulgada.')).toBeNull();
  });
  it('lista respeita parênteses e vírgulas esquecidas', () => {
    expect(dividirLista('Everson; Natanael (Mateo Cassierra), Vitão e Renan Lodi')).toEqual([
      'Everson',
      'Natanael (Mateo Cassierra)',
      'Vitão',
      'Renan Lodi',
    ]);
    expect(dividirLista("Viladôniga (1') João José (64') e Marcelino (89')")).toEqual([
      "Viladôniga (1')",
      "João José (64')",
      "Marcelino (89')",
    ]);
  });
  it('gols: minutos, quantidade, tipos e minuto sem apóstrofo', () => {
    expect(parseGols("Serginho (45' - penalty), Éder Aleixo (58')")).toEqual([
      { jogador: 'Serginho', minuto: 45, tipo: 'penalti' },
      { jogador: 'Éder Aleixo', minuto: 58, tipo: 'normal' },
    ]);
    expect(parseGols('Said (2)')).toHaveLength(2);
    expect(parseGols('Vaguinho (23)')).toEqual([{ jogador: 'Vaguinho', minuto: 23, tipo: 'normal' }]);
    expect(parseGols('Bituca (contra, 60’)')).toEqual([{ jogador: 'Bituca', minuto: 60, tipo: 'contra' }]);
    expect(parseGols('Lucas (2º tempo)')).toEqual([{ jogador: 'Lucas', minuto: null, tipo: 'normal' }]);
    // "?" sozinho: autores e quantidade desconhecidos. Dentro de uma lista, conta 1 gol sem autor.
    expect(parseGols('?')).toEqual([]);
    expect(parseGols('? ; Margival (2)')[0]).toEqual({ jogador: null, minuto: null, tipo: 'normal' });
  });
});

describe('fichas reais', () => {
  it('jogo futuro com campos em branco (Boca 21/11/2026)', () => {
    const { partida, ficha } = porTitulo('21/11/2026 - Boca');
    expect(partida).toMatchObject({
      resultado: null,
      golsPro: null,
      mando: 'fora',
      adversario: 'Boca Juniors',
      advPais: 'Argentina',
      competicao: 'Copa Sul-Americana',
      fase: 'final',
      publico: null,
      renda: null,
      arbitro: 'Andrés Matías Matonte',
      arbitroOrigem: 'Uruguai',
      gols: [],
    });
    expect(ficha.atletico).toBeNull();
    expect(ficha.obs).toBeNull();
  });

  it('ficha completa recente (Grêmio 07/11/2026)', () => {
    const r = porTitulo('07/11/2026 - Atlético MG 1x1 Grêmio');
    expect(r.partida).toMatchObject({
      mando: 'casa',
      resultado: 'E',
      estadio: 'Arena MRV',
      competicao: 'Copa do Brasil',
      fase: 'semifinais',
      publico: 42922,
      renda: { moeda: 'R$', centavos: 545762294 },
      arbitro: 'Ramon Abatti Abel',
      arbitroOrigem: 'SC',
      tecnico: 'Eduardo Domínguez',
      tecnicoAdv: 'Renato Gaúcho',
      expulsoes: [{ jogador: 'Vitão', minuto: 83, lado: 'A' }],
    });
    expect(gols(r)).toEqual(['Renan Lodi|25|normal|A', 'Carlos Vinícius|37|normal|D']);
    expect(r.ficha.atletico?.titulares).toHaveLength(11);
    expect(r.ficha.atletico?.substituicoes[0]).toEqual({ sai: 'Natanael', entra: 'Mateo Cassierra' });
    expect(r.ficha.obs).toMatch(/2\.500 ingressos/);
  });

  it('0x0 sem linha de gols e expulsão do adversário (Mirassol)', () => {
    const r = porTitulo('14/11/2026 - Mirassol');
    expect(r.partida.gols).toEqual([]);
    expect(r.partida.expulsoes).toEqual([{ jogador: 'Edson Carioca', minuto: 90, lado: 'D' }]);
  });

  it('"GOL:" no singular', () => {
    expect(gols(porTitulo('04/11/2026 - Botafogo'))).toEqual(['Edenílson|18|normal|D']);
  });

  it('quebras de linha no meio da escalação (2019)', () => {
    const r = porTitulo('04/12/2019 - Atlético MG 2x0 Botafogo');
    expect(r.ficha.atletico?.titulares).toEqual([
      'Cleiton', 'Guga', 'Igor Rabello', 'Réver', 'Patric', 'José Welison', 'Jair', 'Juan Cazares', 'Marquinhos', 'Franco di Santo', 'Rómulo Otero',
    ]);
    expect(r.partida.tecnico).toBe('Vágner Mancini');
    expect(r.partida.tecnicoAdv).toBe('Alberto Valentim');
    expect(gols(r)).toEqual(['Jair|41|normal|A', 'Luan|69|normal|A']);
  });

  it('primeira partida (1909): público estimado, adversário sem escalação, gols sem minuto', () => {
    const r = porTitulo('21/03/1909');
    expect(r.partida).toMatchObject({ resultado: 'V', golsPro: 3, golsContra: 0, amistoso: true, publico: 3000, publicoEstimado: true, arbitro: null });
    expect(r.ficha.adversario).toBeNull();
    expect(r.partida.gols.every((g) => g.lado === 'A')).toBe(true);
  });

  it('cruzeiros e pênalti (Santos 1983)', () => {
    const r = porTitulo('12/05/1983 - Santos');
    expect(r.partida.renda).toEqual({ moeda: 'Cr$', centavos: 6548000000 });
    expect(gols(r)).toEqual(['Serginho|45|penalti|D', 'Éder Aleixo|58|normal|A', 'Serginho|69|normal|D']);
  });

  it('W.O. nos dois sentidos', () => {
    expect(porTitulo('11/12/2016 - Chapecoense').partida).toMatchObject({ wo: true, resultado: 'D', golsPro: null });
    expect(porTitulo('02/12/1928').partida).toMatchObject({ wo: true, resultado: 'V' });
  });

  it('título com erro ("Atlético SP") e etiqueta do adversário', () => {
    const r = porTitulo('12/05/2019 - Atlético SP');
    expect(r.partida).toMatchObject({ mando: 'casa', advId: 'SP Palmeiras', resultado: 'D', estadio: 'Mineirão' });
  });

  it('Atlético-B é marcado; jogo-treino contra o B não', () => {
    expect(porTitulo('25/11/2017 - Atlético-B').partida.atleticoB).toBe(true);
    const treino = porTitulo('24/12/1950').partida;
    expect(treino.atleticoB).toBe(false);
    expect(treino.adversario).toBe('Atlético-B');
  });

  it('Atlético MG x Atlético PR: lado certo e gols contra', () => {
    const r = porTitulo('03/08/2014');
    expect(r.partida).toMatchObject({ mando: 'casa', advId: 'PR Atlético', adversario: 'Atlético-PR', golsPro: 3, golsContra: 1 });
    expect(r.partida.gols.filter((g) => g.lado === 'A')).toHaveLength(3);
  });

  it('gol contra anotado antes do minuto (Cruzeiro 1947)', () => {
    expect(gols(porTitulo('02/03/1947'))).toContain('Bituca|60|contra|A');
  });

  it('vírgula esquecida entre gols (Uberaba 1963)', () => {
    expect(porTitulo('26/10/1963').partida.gols).toHaveLength(3);
  });

  it('quantidade com tipo: "(2 - penaltys)"', () => {
    const g = porTitulo('22/08/1943').partida.gols.filter((x) => x.jogador === 'Galego');
    expect(g).toHaveLength(2);
    expect(g.every((x) => x.tipo === 'penalti')).toBe(true);
  });

  it('renda em réis e Palestra Itália agrupado com o Cruzeiro (1939)', () => {
    const r = porTitulo('04/06/1939');
    expect(r.partida.renda).toEqual({ moeda: 'Rs', centavos: 700000000 });
    expect(r.partida.advId).toBe('MG Cruzeiro');
  });
});
