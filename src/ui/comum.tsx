import { useMemo, useState, type ReactNode } from 'react';
import type { Resumo } from '../calc';
import { fData, fInt, fPct, fSaldo } from '../formato';
import type { Partida } from '../tipos';

// ---------- links (rotas por hash) ----------
export const linkJogo = (id: string) => `#/jogo/${id}`;
export const linkGrupo = (tipo: string, chave: string) => `#/${tipo}/${encodeURIComponent(chave)}`;

// ---------- cartão com alternância gráfico/tabela ----------
export function Cartao(props: { titulo: string; sub?: ReactNode; children: ReactNode; tabela?: ReactNode; acoes?: ReactNode }) {
  const [verTabela, setVerTabela] = useState(false);
  return (
    <section className="cartao">
      <div className="cartao-topo">
        <div>
          <h3>{props.titulo}</h3>
          {props.sub && <p className="sec peq">{props.sub}</p>}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {props.acoes}
          {props.tabela && (
            <button className="botao-texto peq" onClick={() => setVerTabela(!verTabela)} aria-pressed={verTabela}>
              {verTabela ? 'Ver gráfico' : 'Ver tabela'}
            </button>
          )}
        </div>
      </div>
      {verTabela ? props.tabela : props.children}
    </section>
  );
}

// ---------- números ----------
export function Numeros({ r, extra }: { r: Resumo; extra?: { rotulo: string; valor: string }[] }) {
  return (
    <div className="numeros">
      <div className="numero heroi">
        <div className="rotulo">Aproveitamento</div>
        <div className="valor">{r.j ? fPct(r.aprov) : '–'}</div>
      </div>
      <Numero rotulo="Jogos" valor={fInt(r.j)} />
      <Numero rotulo="Vitórias" valor={fInt(r.v)} />
      <Numero rotulo="Empates" valor={fInt(r.e)} />
      <Numero rotulo="Derrotas" valor={fInt(r.d)} />
      <Numero rotulo="Gols pró" valor={fInt(r.gp)} />
      <Numero rotulo="Gols contra" valor={fInt(r.gc)} />
      <Numero rotulo="Saldo" valor={fSaldo(r.gp - r.gc)} />
      {extra?.map((x) => <Numero key={x.rotulo} {...x} />)}
    </div>
  );
}
const Numero = ({ rotulo, valor }: { rotulo: string; valor: string }) => (
  <div className="numero">
    <div className="rotulo">{rotulo}</div>
    <div className="valor">{valor}</div>
  </div>
);

/** Barra segmentada alta: parte de vitórias, empates e derrotas no total. */
export function BarraVED({ r }: { r: Resumo }) {
  if (!r.j) return null;
  const partes = [
    { k: 'v', nome: 'Vitórias', n: r.v, cor: 'var(--v)' },
    { k: 'e', nome: 'Empates', n: r.e, cor: 'var(--e)' },
    { k: 'd', nome: 'Derrotas', n: r.d, cor: 'var(--d)' },
  ];
  return (
    <div>
      <div className="segmentada" role="img" aria-label={partes.map((p) => `${p.nome}: ${p.n} (${fPct(p.n / r.j)})`).join('; ')}>
        {partes.map((p) =>
          p.n ? (
            <div key={p.k} style={{ flexGrow: p.n, background: p.cor }} title={`${p.nome}: ${fInt(p.n)} (${fPct(p.n / r.j)})`}>
              {p.n / r.j >= 0.09 ? fPct(p.n / r.j) : ''}
            </div>
          ) : null,
        )}
      </div>
      <div className="legenda">
        {partes.map((p) => (
          <span key={p.k}>
            <i className="chave" style={{ background: p.cor }} />
            {p.nome}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------- jogos ----------
export function placar(p: Partida): string {
  if (p.wo) return 'W.O.';
  if (p.golsPro == null) return '×';
  return p.mando === 'casa' ? `${p.golsPro} × ${p.golsContra}` : `${p.golsContra} × ${p.golsPro}`;
}
export const confronto = (p: Partida) =>
  p.mando === 'casa' ? `Atlético ${placar(p)} ${p.adversario}` : `${p.adversario} ${placar(p)} Atlético`;

export function Res({ r }: { r: Partida['resultado'] }) {
  const nome = r === 'V' ? 'Vitória' : r === 'E' ? 'Empate' : r === 'D' ? 'Derrota' : 'A realizar';
  return (
    <span className={`res res-${r}`} title={nome} aria-label={nome}>
      {r ?? '–'}
    </span>
  );
}

export function ListaJogos({ jogos, limite = 50 }: { jogos: Partida[]; limite?: number }) {
  const [n, setN] = useState(limite);
  if (!jogos.length) return <p className="vazio">Nenhum jogo com os filtros atuais.</p>;
  return (
    <>
      <ul className="jogos">
        {jogos.slice(0, n).map((p) => (
          <li key={p.id} className="jogo">
            <span className="num sec peq">{fData(p.data)}</span>
            <Res r={p.resultado} />
            <a href={linkJogo(p.id)}>
              {p.mando === 'casa' ? (
                <>
                  Atlético <span className="placar">{placar(p)}</span> {p.adversario}
                </>
              ) : (
                <>
                  {p.adversario} <span className="placar">{placar(p)}</span> Atlético
                </>
              )}
            </a>
            <span />
            <span className="meta">
              {[p.competicaoNome ?? p.competicao, p.fase, p.estadio].filter(Boolean).join(', ')}
              {p.atleticoB ? ' (Atlético-B)' : ''}
            </span>
          </li>
        ))}
      </ul>
      {jogos.length > n && (
        <button className="botao" style={{ marginTop: 12 }} onClick={() => setN(n + 100)}>
          Mostrar mais {fInt(Math.min(100, jogos.length - n))} de {fInt(jogos.length - n)}
        </button>
      )}
    </>
  );
}

// ---------- tabela ordenável ----------
export interface Coluna<T> {
  titulo: string;
  valor: (x: T) => string | number | null;
  exibir?: (x: T) => ReactNode;
  numerica?: boolean;
}

export function Tabela<T>(props: { linhas: T[]; colunas: Coluna<T>[]; chave: (x: T) => string; ordem?: number; limite?: number; rotulo: string }) {
  // ordem -1 (padrão) mantém a ordem recebida.
  const [ordem, setOrdem] = useState<{ i: number; desc: boolean }>({ i: props.ordem ?? -1, desc: true });
  const [n, setN] = useState(props.limite ?? 100);
  const ordenadas = useMemo(() => {
    const c = props.colunas[ordem.i];
    if (!c) return props.linhas;
    return [...props.linhas].sort((a, b) => {
      const va = c.valor(a);
      const vb = c.valor(b);
      const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va ?? '').localeCompare(String(vb ?? ''), 'pt-BR');
      return ordem.desc ? -r : r;
    });
  }, [props.linhas, props.colunas, ordem]);
  if (!props.linhas.length) return <p className="vazio">Nada para mostrar com os filtros atuais.</p>;
  return (
    <>
      <div className="tabela-rolagem">
        <table aria-label={props.rotulo}>
          <thead>
            <tr>
              {props.colunas.map((c, i) => (
                <th
                  key={c.titulo}
                  className={c.numerica ? 'n' : undefined}
                  aria-sort={ordem.i === i ? (ordem.desc ? 'descending' : 'ascending') : undefined}
                >
                  <button onClick={() => setOrdem({ i, desc: ordem.i === i ? !ordem.desc : !!c.numerica })}>
                    {c.titulo}
                    {ordem.i === i ? (ordem.desc ? ' ↓' : ' ↑') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordenadas.slice(0, n).map((x) => (
              <tr key={props.chave(x)}>
                {props.colunas.map((c) => (
                  <td key={c.titulo} className={c.numerica ? 'n' : undefined}>
                    {c.exibir ? c.exibir(x) : c.valor(x)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ordenadas.length > n && (
        <button className="botao" style={{ marginTop: 12 }} onClick={() => setN(n + 200)}>
          Mostrar mais ({fInt(ordenadas.length - n)} restantes)
        </button>
      )}
    </>
  );
}

/** Colunas padrão de retrospecto. */
export function colunasResumo<T extends Resumo>(): Coluna<T>[] {
  return [
    { titulo: 'J', valor: (x) => x.j, numerica: true },
    { titulo: 'V', valor: (x) => x.v, numerica: true },
    { titulo: 'E', valor: (x) => x.e, numerica: true },
    { titulo: 'D', valor: (x) => x.d, numerica: true },
    { titulo: 'GP', valor: (x) => x.gp, numerica: true },
    { titulo: 'GC', valor: (x) => x.gc, numerica: true },
    { titulo: 'Aprov.', valor: (x) => x.aprov, exibir: (x) => fPct(x.aprov), numerica: true },
  ];
}

export function Busca({ valor, onChange, rotulo }: { valor: string; onChange: (s: string) => void; rotulo: string }) {
  return (
    <input className="busca" type="search" placeholder={rotulo} aria-label={rotulo} value={valor} onChange={(e) => onChange(e.target.value)} />
  );
}
