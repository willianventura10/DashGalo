import { describe, expect, it } from 'vitest';
import { indexarJogadores } from './jogadores';

const esc = (titulares: string[], subs: [string, string][] = []) => ({ titulares, substituicoes: subs.map(([sai, entra]) => ({ sai, entra })) });

describe('indexarJogadores', () => {
  it('conta jogos como titular e como reserva que entrou, unindo grafias com e sem acento', () => {
    const idx = indexarJogadores(
      [esc(['João Leite', 'Reinaldo'], [['Reinaldo', 'Marcelo']]), esc(['Joao Leite', 'Marcelo']), null],
      [1980, 1980, 1981],
    );
    const jl = idx.find((j) => j.chave === 'joao-leite')!;
    expect(jl).toMatchObject({ nome: 'João Leite', titular: [0, 1], entrou: [] });
    expect(idx.find((j) => j.chave === 'marcelo')).toMatchObject({ titular: [1], entrou: [0] });
  });

  it('separa homônimos com mais de 10 anos entre jogos', () => {
    const idx = indexarJogadores([esc(['Fred']), esc(['Fred']), esc(['Fred'])], [1983, 1984, 2026]);
    expect(idx.map((j) => `${j.chave}:${j.titular.length}`).sort()).toEqual(['fred-2:1', 'fred:2']);
  });

  it('ignora lixo de parsing ("?", rótulos)', () => {
    expect(indexarJogadores([esc(['?', '?GOLS: ?', '109', 'Zu'])], [1950]).map((j) => j.nome)).toEqual(['Zu']);
  });
});
