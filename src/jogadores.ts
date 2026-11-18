// Índice de jogadores do Atlético a partir das escalações das fichas.
import { normalizar } from './parser/ficha';
import type { Escalacao } from './tipos';

export interface JogadorIndice {
  chave: string; // slug para a URL (ex.: "joao-leite", "fred-2")
  nome: string; // grafia mais frequente
  titular: number[]; // índices em partidas.json
  entrou: number[];
}

/** Lacuna (em anos) entre jogos que separa homônimos em jogadores diferentes. */
export const LACUNA_JOGADOR = 10;

const nomeValido = (n: string) => /[a-zà-ÿ]/i.test(n) && !/[?:]/.test(n);

/**
 * `escalacoes[i]` é a escalação do Atlético na partida de índice i (ordem cronológica), `anos[i]` o ano dela.
 */
export function indexarJogadores(escalacoes: (Escalacao | null)[], anos: number[]): JogadorIndice[] {
  const porNome = new Map<string, { i: number; nome: string; titular: boolean }[]>();
  escalacoes.forEach((e, i) => {
    if (!e) return;
    const vistos = new Set<string>();
    const add = (nome: string, titular: boolean) => {
      if (!nomeValido(nome)) return;
      const k = normalizar(nome);
      if (vistos.has(k)) return; // mesmo nome duas vezes no jogo conta uma
      vistos.add(k);
      const l = porNome.get(k) ?? [];
      l.push({ i, nome, titular });
      porNome.set(k, l);
    };
    e.titulares.forEach((n) => add(n, true));
    e.substituicoes.forEach((s) => add(s.entra, false));
  });

  const saida: JogadorIndice[] = [];
  for (const [k, jogos] of porNome) {
    const slug = k.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'jogador';
    let carreira: typeof jogos = [];
    let n = 0;
    const fechar = () => {
      if (!carreira.length) return;
      const contagem = new Map<string, number>();
      carreira.forEach((x) => contagem.set(x.nome, (contagem.get(x.nome) ?? 0) + 1));
      saida.push({
        chave: n === 0 ? slug : `${slug}-${n + 1}`,
        nome: [...contagem.entries()].sort((a, b) => b[1] - a[1])[0][0],
        titular: carreira.filter((x) => x.titular).map((x) => x.i),
        entrou: carreira.filter((x) => !x.titular).map((x) => x.i),
      });
      n++;
      carreira = [];
    };
    for (const j of jogos) {
      const ult = carreira[carreira.length - 1];
      if (ult && anos[j.i] - anos[ult.i] > LACUNA_JOGADOR) fechar();
      carreira.push(j);
    }
    fechar();
  }
  return saida.sort((a, b) => b.titular.length + b.entrou.length - (a.titular.length + a.entrou.length));
}
