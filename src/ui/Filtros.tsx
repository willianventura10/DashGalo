import { useState } from 'react';
import { filtrosPadrao, type Filtros } from '../calc';
import type { Partida } from '../tipos';

const ATALHOS: { nome: string; de: (fim: number) => number }[] = [
  { nome: 'Desde 2000', de: () => 2000 },
  { nome: 'Últimos 10 anos', de: (fim) => fim - 9 },
];

export function BarraFiltros(props: { f: Filtros; set: (f: Filtros) => void; anos: [number, number]; competicoes: string[]; total: number }) {
  const { f, set, anos } = props;
  const lista = Array.from({ length: anos[1] - anos[0] + 1 }, (_, i) => anos[0] + i);
  const padrao = filtrosPadrao(anos);
  const mudou = JSON.stringify(f) !== JSON.stringify(padrao);
  const [aberto, setAberto] = useState(false);
  const resumo = [
    f.de === f.ate ? String(f.de) : `${f.de}–${f.ate}`,
    f.competicao ? nomeCompeticao(f.competicao) : f.amistosos ? 'todas as competições' : 'jogos oficiais',
    f.mando === 'casa' ? 'mandante' : f.mando === 'fora' ? 'visitante' : '',
    f.atleticoB ? 'com Atlético-B' : '',
  ].filter(Boolean).join(', ');
  return (
    <div className={`filtros${aberto ? ' aberto' : ''}`} role="search" aria-label="Filtros">
      <button className="filtros-resumo" aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
        <span>Filtros: {resumo}</span>
        <span className="mudo">{props.total.toLocaleString('pt-BR')} jogos</span>
      </button>
      <div className="filtros-linha">
        <label>
          De
          <select value={f.de} onChange={(e) => set({ ...f, de: Math.min(Number(e.target.value), f.ate) })}>
            {lista.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
        <label>
          até
          <select value={f.ate} onChange={(e) => set({ ...f, ate: Math.max(Number(e.target.value), f.de) })}>
            {lista.map((a) => <option key={a}>{a}</option>)}
          </select>
        </label>
        {ATALHOS.map((a) => (
          <button key={a.nome} className="botao peq" onClick={() => set({ ...f, de: a.de(anos[1]), ate: anos[1] })} aria-pressed={f.de === a.de(anos[1]) && f.ate === anos[1]}>
            {a.nome}
          </button>
        ))}
        <label>
          Competição
          <select value={f.competicao} onChange={(e) => set({ ...f, competicao: e.target.value })}>
            <option value="">{f.amistosos ? 'Todas' : 'Todas oficiais'}</option>
            {props.competicoes.map((c) => <option key={c} value={c}>{nomeCompeticao(c)}</option>)}
          </select>
        </label>
        <label>
          Mando
          <select value={f.mando} onChange={(e) => set({ ...f, mando: e.target.value as Filtros['mando'] })}>
            <option value="">Todos</option>
            <option value="casa">Atlético mandante</option>
            <option value="fora">Atlético visitante</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={f.amistosos} onChange={(e) => set({ ...f, amistosos: e.target.checked })} />
          Incluir amistosos
        </label>
        <label>
          <input type="checkbox" checked={f.atleticoB} onChange={(e) => set({ ...f, atleticoB: e.target.checked })} />
          Incluir Atlético-B
        </label>
        {mudou && (
          <button className="botao-texto peq" onClick={() => set(padrao)}>
            Limpar filtros
          </button>
        )}
        <span className="mudo peq" aria-live="polite">{props.total.toLocaleString('pt-BR')} jogos</span>
      </div>
    </div>
  );
}

const NOMES: Record<string, string> = {
  'Cmp Mineiro': 'Campeonato Mineiro',
  'Cmp Brasileiro': 'Campeonato Brasileiro',
  'Cmp Brasileiro B': 'Brasileiro Série B',
};
export const nomeCompeticao = (c: string) => NOMES[c] ?? c;

export function competicoesDe(ps: Partida[]): string[] {
  const n = new Map<string, number>();
  ps.forEach((p) => n.set(p.competicao, (n.get(p.competicao) ?? 0) + 1));
  return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
}
