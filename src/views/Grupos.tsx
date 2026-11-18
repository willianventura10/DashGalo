import { useMemo, useState } from 'react';
import { agrupar, goleadas, resumo, type Grupo } from '../calc';
import { fData, fInt, fPct } from '../formato';
import { normalizar } from '../parser/ficha';
import type { Partida } from '../tipos';
import { BarraVED, Busca, CasaFora, Cartao, colunasResumo, confronto, linkGrupo, linkJogo, ListaJogos, Numeros, Tabela, type Coluna } from '../ui/comum';
import { nomeCompeticao } from '../ui/Filtros';
import { GraficoRanking } from '../ui/graficos';

interface Config {
  titulo: string;
  singular: string;
  descricao: string;
  chave: (p: Partida) => string | null;
  rotulo: (p: Partida) => string;
  extras?: Coluna<Grupo>[];
  ordem?: number;
}

const periodo = (g: Grupo) => (g.primeiro.ano === g.ultimo.ano ? String(g.primeiro.ano) : `${g.primeiro.ano}–${g.ultimo.ano}`);
const ultimo: Coluna<Grupo> = {
  titulo: 'Último jogo',
  valor: (g) => g.ultimo.data,
  exibir: (g) => <a href={linkJogo(g.ultimo.id)}>{fData(g.ultimo.data)}</a>,
};
const colPeriodo: Coluna<Grupo> = { titulo: 'Período', valor: (g) => g.primeiro.ano, exibir: periodo };

export const GRUPOS: Record<string, Config> = {
  adversarios: {
    titulo: 'Adversários',
    singular: 'adversário',
    descricao: 'Retrospecto contra cada clube. O Palestra Itália aparece somado ao Cruzeiro, como nas etiquetas do blog.',
    chave: (p) => p.advId,
    rotulo: (p) => p.adversario,
    extras: [{ titulo: 'Origem', valor: (g) => (g.primeiro.advPais === 'Brasil' ? g.primeiro.advSigla : g.primeiro.advPais) }, ultimo],
  },
  competicoes: {
    titulo: 'Competições',
    singular: 'competição',
    descricao: 'Retrospecto por competição, conforme as etiquetas do blog.',
    chave: (p) => p.competicao,
    rotulo: (p) => nomeCompeticao(p.competicao),
    extras: [colPeriodo],
  },
  estadios: {
    titulo: 'Estádios',
    singular: 'estádio',
    descricao: 'Retrospecto por estádio. Público médio considera só os jogos com público informado.',
    chave: (p) => p.estadio,
    rotulo: (p) => p.estadio ?? '',
    extras: [
      { titulo: 'Cidade', valor: (g) => g.primeiro.cidade },
      {
        titulo: 'Público médio',
        valor: (g) => mediaPublico(g.partidas),
        exibir: (g) => fInt(mediaPublico(g.partidas)),
        numerica: true,
      },
      ultimo,
    ],
  },
  tecnicos: {
    titulo: 'Técnicos',
    singular: 'técnico',
    descricao: 'Retrospecto de cada técnico do Atlético, pelo nome registrado na ficha.',
    chave: (p) => (p.tecnico ? normalizar(p.tecnico) : null),
    rotulo: (p) => p.tecnico ?? '',
    extras: [colPeriodo],
  },
  arbitros: {
    titulo: 'Árbitros',
    singular: 'árbitro',
    descricao: 'Retrospecto do Atlético com cada árbitro e quantas expulsões de atleticanos ele deu.',
    chave: (p) => (p.arbitro ? normalizar(p.arbitro) : null),
    rotulo: (p) => p.arbitro ?? '',
    extras: [
      { titulo: 'Origem', valor: (g) => g.primeiro.arbitroOrigem },
      {
        titulo: 'Expulsões do Atlético',
        valor: (g) => g.partidas.reduce((s, p) => s + p.expulsoes.filter((e) => e.lado === 'A').length, 0),
        numerica: true,
      },
      colPeriodo,
    ],
  },
};

function mediaPublico(ps: Partida[]): number | null {
  const com = ps.filter((p) => p.publico);
  return com.length ? Math.round(com.reduce((s, p) => s + (p.publico ?? 0), 0) / com.length) : null;
}

export function ListaGrupos({ tipo, ps }: { tipo: string; ps: Partida[] }) {
  const cfg = GRUPOS[tipo];
  const [busca, setBusca] = useState('');
  const grupos = useMemo(() => agrupar(ps, cfg.chave, cfg.rotulo), [ps, cfg]);
  const filtrados = busca ? grupos.filter((g) => normalizar(g.nome).includes(normalizar(busca))) : grupos;
  const colunas: Coluna<Grupo>[] = [
    { titulo: cfg.singular[0].toUpperCase() + cfg.singular.slice(1), valor: (g) => g.nome, exibir: (g) => <a href={linkGrupo(tipo, g.chave)}>{g.nome}</a> },
    ...colunasResumo<Grupo>(),
    ...(cfg.extras ?? []),
  ];
  const ranking = [...grupos].sort((a, b) => b.j - a.j).slice(0, 12);
  return (
    <>
      <div className="cabeca">
        <h2>{cfg.titulo}</h2>
        <p className="sec">{cfg.descricao}</p>
      </div>
      {tipo === 'competicoes' || tipo === 'adversarios' ? (
        <Cartao
          titulo={tipo === 'competicoes' ? 'Aproveitamento por competição' : 'Adversários mais enfrentados'}
          sub={tipo === 'competicoes' ? 'Competições com 10 jogos ou mais no recorte' : 'Número de jogos'}
        >
          {tipo === 'competicoes' ? (
            <GraficoRanking
              itens={grupos
                .filter((g) => g.j >= 10)
                .sort((a, b) => b.aprov - a.aprov)
                .map((g) => ({ nome: g.nome, valor: g.aprov, detalhe: `${fInt(g.j)} jogos` }))}
              formato={fPct}
              dica="de aproveitamento"
            />
          ) : (
            <GraficoRanking
              itens={ranking.map((g) => ({ nome: g.nome, valor: g.j, detalhe: `${g.v}V ${g.e}E ${g.d}D, ${fPct(g.aprov)}` }))}
              dica="jogos"
            />
          )}
        </Cartao>
      ) : null}
      <section className="cartao">
        <div className="cartao-topo">
          <p className="sec peq">
            {fInt(filtrados.length)} {cfg.titulo.toLowerCase()}. Clique no nome para ver os jogos.
          </p>
          <Busca valor={busca} onChange={setBusca} rotulo={`Buscar ${cfg.singular}`} />
        </div>
        <Tabela rotulo={cfg.titulo} linhas={filtrados} colunas={colunas} chave={(g) => g.chave} ordem={1} />
      </section>
    </>
  );
}

export function DetalheGrupo({ tipo, chave, ps }: { tipo: string; chave: string; ps: Partida[] }) {
  const cfg = GRUPOS[tipo];
  const jogos = ps.filter((p) => cfg.chave(p) === chave);
  const grupo = agrupar(jogos, cfg.chave, cfg.rotulo)[0];
  if (!grupo) {
    return (
      <div className="cabeca">
        <a href={`#/${tipo}`}>{cfg.titulo}</a>
        <p className="vazio">Nenhum jogo realizado com os filtros atuais.</p>
      </div>
    );
  }
  const r = resumo(jogos);
  const porComp = agrupar(jogos, (p) => p.competicao, (p) => nomeCompeticao(p.competicao));
  const melhor = goleadas(jogos, 'V', 1)[0];
  const pior = goleadas(jogos, 'D', 1)[0];
  return (
    <>
      <div className="cabeca">
        <a className="peq" href={`#/${tipo}`}>{cfg.titulo}</a>
        <h2>{grupo.nome}</h2>
        <p className="sec">
          {fInt(r.j)} jogos entre {fData(grupo.primeiro.data)} e {fData(grupo.ultimo.data)}.
        </p>
      </div>
      <Numeros r={r} />
      <section className="cartao">
        <BarraVED r={r} />
        {(melhor || pior) && (
          <dl className="dl" style={{ marginTop: 16 }}>
            {melhor && (
              <>
                <dt>Maior vitória</dt>
                <dd><a href={linkJogo(melhor.id)}>{confronto(melhor)}</a>, {fData(melhor.data)}</dd>
              </>
            )}
            {pior && (
              <>
                <dt>Maior derrota</dt>
                <dd><a href={linkJogo(pior.id)}>{confronto(pior)}</a>, {fData(pior.data)}</dd>
              </>
            )}
          </dl>
        )}
      </section>
      {tipo !== 'estadios' && <CasaFora ps={jogos} />}
      {tipo !== 'competicoes' && porComp.length > 1 && (
        <section className="cartao">
          <h3 style={{ marginBottom: 8 }}>Por competição</h3>
          <Tabela
            rotulo="Por competição"
            linhas={porComp}
            chave={(g) => g.chave}
            ordem={1}
            colunas={[{ titulo: 'Competição', valor: (g) => g.nome }, ...colunasResumo<Grupo>()]}
          />
        </section>
      )}
      <Cartao titulo="Jogos" sub="Do mais recente ao mais antigo">
        <ListaJogos jogos={[...jogos].reverse()} />
      </Cartao>
    </>
  );
}
