import { useMemo, useState } from 'react';
import { artilheiros, CRITERIOS_SEQUENCIA, goleadas, realizadas, sequencia, topPor, type Artilheiro } from '../calc';
import { fData, fInt, fReal } from '../formato';
import { normalizar } from '../parser/ficha';
import type { Partida } from '../tipos';
import { Busca, Cartao, confronto, linkJogo, ListaJogos, Tabela, type Coluna } from '../ui/comum';
import { nomeCompeticao } from '../ui/Filtros';
import { GraficoColunas, GraficoRanking } from '../ui/graficos';
import { linkJogador } from './Jogadores';

const colJogo: Coluna<Partida> = { titulo: 'Jogo', valor: (p) => confronto(p), exibir: (p) => <a href={linkJogo(p.id)}>{confronto(p)}</a> };
const colData: Coluna<Partida> = { titulo: 'Data', valor: (p) => p.data, exibir: (p) => fData(p.data) };
const colComp: Coluna<Partida> = { titulo: 'Competição', valor: (p) => nomeCompeticao(p.competicao) };

// ---------- público e renda ----------
export function Publico({ ps }: { ps: Partida[] }) {
  const jogos = realizadas(ps);
  const maiores = topPor(jogos, (p) => p.publico, 20);
  const porAno = useMemo(() => {
    const m = new Map<number, number[]>();
    jogos.forEach((p) => p.publico && m.set(p.ano, [...(m.get(p.ano) ?? []), p.publico]));
    return [...m.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([periodo, l]) => ({ periodo, valor: l.reduce((s, x) => s + x, 0) / l.length, detalhe: `${l.length} jogos com público informado` }));
  }, [jogos]);
  const rendas = topPor(
    jogos.filter((p) => p.renda?.moeda === 'R$'),
    (p) => p.renda?.centavos ?? 0,
    20,
  );
  const tabelaAno = (
    <Tabela
      rotulo="Público médio por ano"
      linhas={porAno}
      chave={(x) => String(x.periodo)}
      colunas={[
        { titulo: 'Ano', valor: (x) => x.periodo },
        { titulo: 'Público médio', valor: (x) => Math.round(x.valor), exibir: (x) => fInt(Math.round(x.valor)), numerica: true },
        { titulo: 'Jogos com público', valor: (x) => Number(x.detalhe.split(' ')[0]), numerica: true },
      ]}
    />
  );
  return (
    <>
      <div className="cabeca">
        <h2>Público e renda</h2>
        <p className="sec">Público pagante ou presente, como registrado. Antes de 1960 a maioria das fichas não traz público.</p>
      </div>
      <Cartao titulo="Público médio por ano" sub="Média dos jogos com público informado" tabela={tabelaAno}>
        <GraficoColunas itens={porAno} dica="torcedores em média" />
      </Cartao>
      <Cartao titulo="Maiores públicos" sub="Os 20 maiores do recorte">
        <Tabela
          rotulo="Maiores públicos"
          linhas={maiores}
          chave={(p) => p.id}
          ordem={1}
          colunas={[
            colJogo,
            { titulo: 'Público', valor: (p) => p.publico, exibir: (p) => `${fInt(p.publico)}${p.publicoEstimado ? ' (estimado)' : ''}`, numerica: true },
            { titulo: 'Tipo', valor: (p) => p.publicoTipo },
            colData,
            { titulo: 'Estádio', valor: (p) => p.estadio },
            colComp,
          ]}
        />
      </Cartao>
      <Cartao titulo="Maiores rendas em reais" sub="Só a partir do Real (julho de 1994). Valores nominais, sem correção pela inflação.">
        <Tabela
          rotulo="Maiores rendas"
          linhas={rendas}
          chave={(p) => p.id}
          ordem={1}
          colunas={[
            colJogo,
            { titulo: 'Renda', valor: (p) => p.renda?.centavos ?? 0, exibir: (p) => fReal(p.renda?.centavos ?? 0), numerica: true },
            { titulo: 'Público', valor: (p) => p.publico, exibir: (p) => fInt(p.publico), numerica: true },
            colData,
            { titulo: 'Estádio', valor: (p) => p.estadio },
          ]}
        />
      </Cartao>
    </>
  );
}

// ---------- artilheiros ----------
export function Artilheiros({ ps }: { ps: Partida[] }) {
  const lista = useMemo(() => artilheiros(ps), [ps]);
  const [busca, setBusca] = useState('');
  const filtrados = busca ? lista.filter((a) => normalizar(a.nome).includes(normalizar(busca))) : lista;
  const jogos = realizadas(ps);
  const total = jogos.reduce((s, p) => s + (p.golsPro ?? 0), 0);
  const identificados = lista.reduce((s, a) => s + a.gols, 0);
  const periodo = (a: Artilheiro) => (a.de === a.ate ? String(a.de) : `${a.de}–${a.ate}`);
  return (
    <>
      <div className="cabeca">
        <h2>Artilheiros</h2>
        <p className="sec">
          {fInt(identificados)} dos {fInt(total)} gols do Atlético no recorte têm autor identificado nas fichas. Gols contra ficam fora.
        </p>
      </div>
      <Cartao titulo="Maiores artilheiros" sub="Gols marcados pelo Atlético">
        <GraficoRanking itens={lista.slice(0, 15).map((a) => ({ nome: a.nome, valor: a.gols, detalhe: periodo(a) }))} dica="gols" />
      </Cartao>
      <section className="cartao">
        <div className="cartao-topo">
          <p className="sec peq">Jogadores com o mesmo nome separados por mais de 12 anos aparecem em linhas diferentes.</p>
          <Busca valor={busca} onChange={setBusca} rotulo="Buscar jogador" />
        </div>
        <Tabela
          rotulo="Artilheiros"
          linhas={filtrados}
          chave={(a) => a.chave}
          ordem={1}
          colunas={[
            { titulo: 'Jogador', valor: (a) => a.nome, exibir: (a) => <a href={linkJogador(a.nome)}>{a.nome}</a> },
            { titulo: 'Gols', valor: (a) => a.gols, numerica: true },
            { titulo: 'Pênaltis', valor: (a) => a.penaltis, numerica: true },
            { titulo: 'Faltas', valor: (a) => a.faltas, numerica: true },
            { titulo: 'Jogos com gol', valor: (a) => a.jogosComGol, numerica: true },
            { titulo: 'Período', valor: (a) => a.de, exibir: periodo },
          ]}
        />
      </section>
    </>
  );
}

// ---------- recordes ----------
export function Recordes({ ps }: { ps: Partida[] }) {
  const jogos = realizadas(ps);
  const sequencias = CRITERIOS_SEQUENCIA.map((c) => ({ ...c, ...sequencia(jogos, c.teste) }));
  const maisGols = topPor(jogos.filter((p) => !p.wo), (p) => (p.golsPro ?? 0) + (p.golsContra ?? 0), 10);
  const colPlacar: Coluna<Partida>[] = [colJogo, colData, colComp];
  return (
    <>
      <div className="cabeca">
        <h2>Recordes e sequências</h2>
        <p className="sec">Calculados sobre os jogos do recorte, em ordem cronológica. Jogos decididos por W.O. ficam de fora.</p>
      </div>
      <section className="cartao">
        <h3 style={{ marginBottom: 8 }}>Sequências</h3>
        <Tabela
          rotulo="Sequências"
          linhas={sequencias}
          chave={(s) => s.id}
          ordem={-1}
          colunas={[
            { titulo: 'Sequência', valor: (s) => s.nome },
            { titulo: 'Recorde', valor: (s) => s.recorde.tamanho, numerica: true },
            {
              titulo: 'Período do recorde',
              valor: (s) => s.recorde.inicio?.data ?? '',
              exibir: (s) =>
                s.recorde.inicio && s.recorde.fim ? (
                  <>
                    <a href={linkJogo(s.recorde.inicio.id)}>{fData(s.recorde.inicio.data)}</a> a{' '}
                    <a href={linkJogo(s.recorde.fim.id)}>{fData(s.recorde.fim.data)}</a>
                  </>
                ) : (
                  '–'
                ),
            },
            { titulo: 'Sequência atual', valor: (s) => s.atual.tamanho, numerica: true },
          ]}
        />
      </section>
      <div className="grade-2">
        <Cartao titulo="Maiores vitórias">
          <Tabela rotulo="Maiores vitórias" linhas={goleadas(jogos, 'V')} chave={(p) => p.id} ordem={-1} colunas={colPlacar} />
        </Cartao>
        <Cartao titulo="Maiores derrotas">
          <Tabela rotulo="Maiores derrotas" linhas={goleadas(jogos, 'D')} chave={(p) => p.id} ordem={-1} colunas={colPlacar} />
        </Cartao>
      </div>
      <Cartao titulo="Jogos com mais gols">
        <Tabela
          rotulo="Jogos com mais gols"
          linhas={maisGols}
          chave={(p) => p.id}
          ordem={1}
          colunas={[colJogo, { titulo: 'Gols', valor: (p) => (p.golsPro ?? 0) + (p.golsContra ?? 0), numerica: true }, colData, colComp]}
        />
      </Cartao>
    </>
  );
}

// ---------- lista de jogos ----------
export function Jogos({ ps }: { ps: Partida[] }) {
  const [busca, setBusca] = useState('');
  const q = normalizar(busca);
  const lista = useMemo(() => {
    const todos = [...ps].reverse();
    if (!q) return todos;
    return todos.filter((p) =>
      normalizar([p.adversario, p.data.split('-').reverse().join('/'), p.estadio, p.competicaoNome, p.tecnico].join(' ')).includes(q),
    );
  }, [ps, q]);
  return (
    <>
      <div className="cabeca">
        <h2>Jogos</h2>
        <p className="sec">Todas as partidas do recorte, da mais recente à mais antiga. Busque por adversário, data, estádio ou técnico.</p>
      </div>
      <section className="cartao">
        <div className="cartao-topo">
          <p className="sec peq">{fInt(lista.length)} jogos</p>
          <Busca valor={busca} onChange={setBusca} rotulo="Buscar jogo" />
        </div>
        <ListaJogos key={q} jogos={lista} />
      </section>
    </>
  );
}
