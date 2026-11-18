import { useEffect, useMemo, useState } from 'react';
import { agrupar, resumo, type Grupo } from '../calc';
import { fData, fInt } from '../formato';
import type { JogadorIndice } from '../jogadores';
import { normalizar } from '../parser/ficha';
import type { Partida } from '../tipos';
import { BarraVED, Busca, CasaFora, Cartao, colunasResumo, ListaJogos, Numeros, Tabela, linkJogo } from '../ui/comum';
import { nomeCompeticao } from '../ui/Filtros';

// ---------- carga do índice (sob demanda, uma vez) ----------
let cache: Promise<JogadorIndice[]> | null = null;
export const carregarJogadores = () =>
  (cache ??= fetch(`${import.meta.env.BASE_URL}data/jogadores.json`).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }));

export function useJogadores(): JogadorIndice[] | null | 'erro' {
  const [j, setJ] = useState<JogadorIndice[] | null | 'erro'>(null);
  useEffect(() => {
    carregarJogadores()
      .then(setJ)
      .catch(() => {
        cache = null;
        setJ('erro');
      });
  }, []);
  return j;
}

export const linkJogador = (chave: string) => `#/jogadores/${encodeURIComponent(chave)}`;

// ---------- estatísticas de um jogador no recorte ----------
interface Linha {
  j: JogadorIndice;
  jogos: Partida[];
  titular: number;
  entrou: number;
  gols: number;
  penaltis: number;
  de: number;
  ate: number;
}

function estatisticas(j: JogadorIndice, todas: Partida[], noRecorte: Set<string>): Linha {
  const tit = new Set(j.titular);
  const idx = [...j.titular, ...j.entrou].sort((a, b) => a - b);
  const jogos = idx.map((i) => todas[i]).filter((p) => p && noRecorte.has(p.id) && p.resultado);
  const nome = normalizar(j.nome);
  let gols = 0;
  let penaltis = 0;
  for (const p of jogos)
    for (const g of p.gols)
      if (g.lado === 'A' && g.tipo !== 'contra' && g.jogador && normalizar(g.jogador) === nome) {
        gols++;
        if (g.tipo === 'penalti') penaltis++;
      }
  const titular = idx.filter((i) => tit.has(i) && noRecorte.has(todas[i]?.id) && todas[i].resultado).length;
  return {
    j,
    jogos,
    titular,
    entrou: jogos.length - titular,
    gols,
    penaltis,
    de: jogos[0]?.ano ?? 0,
    ate: jogos[jogos.length - 1]?.ano ?? 0,
  };
}

// ---------- lista e busca ----------
export function Jogadores({ ps, todas, busca: buscaInicial }: { ps: Partida[]; todas: Partida[]; busca?: string }) {
  const indice = useJogadores();
  const [busca, setBusca] = useState(buscaInicial ?? '');
  const noRecorte = useMemo(() => new Set(ps.map((p) => p.id)), [ps]);
  const linhas = useMemo(
    () => (Array.isArray(indice) ? indice.map((j) => estatisticas(j, todas, noRecorte)).filter((l) => l.jogos.length) : []),
    [indice, todas, noRecorte],
  );
  const q = normalizar(busca);
  const filtradas = q ? linhas.filter((l) => normalizar(l.j.nome).includes(q)) : linhas;
  const periodo = (l: Linha) => (l.de === l.ate ? String(l.de) : `${l.de}–${l.ate}`);
  return (
    <>
      <div className="cabeca">
        <h2>Jogadores</h2>
        <p className="sec" style={{ maxWidth: '72ch' }}>
          Quem vestiu a camisa do Atlético, segundo as escalações das fichas. Conta jogos como titular e como reserva que entrou em campo.
          As escalações existem para quase todos os jogos a partir dos anos 1930; antes disso, muitas fichas não trazem o time.
        </p>
      </div>
      <section className="cartao">
        <div className="cartao-topo">
          <p className="sec peq" aria-live="polite">
            {indice === null ? 'Carregando jogadores…' : indice === 'erro' ? 'Não foi possível carregar os jogadores. Recarregue a página.' : `${fInt(filtradas.length)} jogadores no recorte`}
          </p>
          <Busca valor={busca} onChange={setBusca} rotulo="Buscar jogador" />
        </div>
        {q && Array.isArray(indice) && filtradas.length === 0 && (
          <p className="vazio">
            Nenhum jogador com “{busca}” nas escalações do recorte. Confira a grafia (o blog usa o nome de camisa, ex.: “Dadá” aparece como “Dario”) ou
            amplie os filtros.
          </p>
        )}
        {filtradas.length > 0 && (
          <Tabela
            rotulo="Jogadores"
            linhas={filtradas}
            chave={(l) => l.j.chave}
            ordem={1}
            limite={100}
            colunas={[
              { titulo: 'Jogador', valor: (l) => l.j.nome, exibir: (l) => <a href={linkJogador(l.j.chave)}>{l.j.nome}</a> },
              { titulo: 'Jogos', valor: (l) => l.jogos.length, numerica: true },
              { titulo: 'Titular', valor: (l) => l.titular, numerica: true },
              { titulo: 'Entrou', valor: (l) => l.entrou, numerica: true },
              { titulo: 'Gols', valor: (l) => l.gols, numerica: true },
              { titulo: 'Período', valor: (l) => l.de, exibir: periodo },
            ]}
          />
        )}
      </section>
    </>
  );
}

// ---------- página do jogador ----------
export function DetalheJogador({ chave, ps, todas }: { chave: string; ps: Partida[]; todas: Partida[] }) {
  const indice = useJogadores();
  const noRecorte = useMemo(() => new Set(ps.map((p) => p.id)), [ps]);
  if (indice === null) return <p className="vazio">Carregando jogadores…</p>;
  if (indice === 'erro') return <p className="vazio">Não foi possível carregar os jogadores. Recarregue a página.</p>;
  const j = indice.find((x) => x.chave === chave);
  // Não é uma chave: trata como busca por nome (links dos artilheiros).
  if (!j) return <Jogadores ps={ps} todas={todas} busca={chave} />;

  const l = estatisticas(j, todas, noRecorte);
  const homonimos = indice.filter((x) => x !== j && normalizar(x.nome) === normalizar(j.nome));
  const titular = new Set(j.titular);
  const indicePorId = new Map(todas.map((p, i) => [p.id, i]));
  const r = resumo(l.jogos);
  const porComp = agrupar(l.jogos, (p) => p.competicao, (p) => nomeCompeticao(p.competicao));
  const tecnicos = agrupar(l.jogos, (p) => (p.tecnico ? normalizar(p.tecnico) : null), (p) => p.tecnico ?? '')
    .sort((a, b) => b.j - a.j)
    .slice(0, 5);
  const expulsoes = l.jogos.filter((p) => p.expulsoes.some((e) => e.lado === 'A' && normalizar(e.jogador) === normalizar(j.nome))).length;
  const total = j.titular.length + j.entrou.length;

  return (
    <>
      <div className="cabeca">
        <a className="peq" href="#/jogadores">Jogadores</a>
        <h2>{j.nome}</h2>
        {l.jogos.length ? (
          <p className="sec">
            {fInt(l.jogos.length)} jogos pelo Atlético no recorte, de <a href={linkJogo(l.jogos[0].id)}>{fData(l.jogos[0].data)}</a> a{' '}
            <a href={linkJogo(l.jogos[l.jogos.length - 1].id)}>{fData(l.jogos[l.jogos.length - 1].data)}</a>
            {total > l.jogos.length ? ` (${fInt(total)} contando todos os jogos registrados)` : ''}.
          </p>
        ) : (
          <p className="sec">Nenhum jogo deste jogador com os filtros atuais ({fInt(total)} no total). Amplie o período ou inclua amistosos.</p>
        )}
        {homonimos.length > 0 && (
          <p className="aviso">
            Há outro{homonimos.length > 1 ? 's' : ''} {j.nome} em outra época:{' '}
            {homonimos.map((h, i) => (
              <span key={h.chave}>
                {i > 0 && ', '}
                <a href={linkJogador(h.chave)}>{periodoIndice(h, todas)}</a>
              </span>
            ))}
            .
          </p>
        )}
      </div>
      {l.jogos.length > 0 && (
        <>
          <Numeros
            r={r}
            extra={[
              { rotulo: 'Como titular', valor: fInt(l.titular) },
              { rotulo: 'Entrou no jogo', valor: fInt(l.entrou) },
              { rotulo: 'Gols marcados', valor: fInt(l.gols) },
              { rotulo: 'Expulsões', valor: fInt(expulsoes) },
            ]}
          />
          <p className="sec peq" style={{ marginTop: -12 }}>
            Gols pró e contra, saldo e aproveitamento são do time nos jogos em que ele esteve em campo.
          </p>
          <section className="cartao">
            <h3 style={{ marginBottom: 12 }}>Resultados com ele em campo</h3>
            <BarraVED r={r} />
          </section>
          <CasaFora ps={l.jogos} />
          <div className="grade-2">
            <section className="cartao">
              <h3 style={{ marginBottom: 8 }}>Por competição</h3>
              <Tabela rotulo="Por competição" linhas={porComp} chave={(g) => g.chave} ordem={1} colunas={[{ titulo: 'Competição', valor: (g) => g.nome }, ...colunasResumo<Grupo>().filter((c) => !['GP', 'GC'].includes(c.titulo))]} />
            </section>
            <section className="cartao">
              <h3 style={{ marginBottom: 8 }}>Técnicos com quem mais jogou</h3>
              <Tabela rotulo="Técnicos" linhas={tecnicos} chave={(g) => g.chave} ordem={1} colunas={[{ titulo: 'Técnico', valor: (g) => g.nome }, ...colunasResumo<Grupo>().filter((c) => !['GP', 'GC'].includes(c.titulo))]} />
            </section>
          </div>
          <Cartao titulo="Jogos" sub="Do mais recente ao mais antigo">
            <ListaJogos
              jogos={[...l.jogos].reverse()}
              nota={(p) => {
                const g = p.gols.filter((x) => x.lado === 'A' && x.tipo !== 'contra' && x.jogador && normalizar(x.jogador) === normalizar(j.nome)).length;
                const papel = titular.has(indicePorId.get(p.id) ?? -1) ? null : 'entrou';
                return [papel, g ? `${g} gol${g > 1 ? 's' : ''}` : null].filter(Boolean).join(', ') || null;
              }}
            />
          </Cartao>
        </>
      )}
    </>
  );
}

function periodoIndice(j: JogadorIndice, todas: Partida[]): string {
  const anos = [...j.titular, ...j.entrou].map((i) => todas[i]?.ano).filter(Boolean).sort();
  return anos[0] === anos[anos.length - 1] ? String(anos[0]) : `${anos[0]}–${anos[anos.length - 1]}`;
}
