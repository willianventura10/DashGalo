import { useEffect, useMemo, useState } from 'react';
import { aplicarFiltros, filtrosPadrao, type Filtros } from './calc';
import { fData } from './formato';
import type { ArquivoPartidas, Partida } from './tipos';
import { BarraFiltros, competicoesDe } from './ui/Filtros';
import { Ficha } from './views/Ficha';
import { Geral } from './views/Geral';
import { DetalheGrupo, GRUPOS, ListaGrupos } from './views/Grupos';
import { Artilheiros, Jogos, Publico, Recordes } from './views/Outras';

const ABAS: [string, string][] = [
  ['', 'Visão geral'],
  ['adversarios', 'Adversários'],
  ['competicoes', 'Competições'],
  ['estadios', 'Estádios'],
  ['publico', 'Público e renda'],
  ['artilheiros', 'Artilheiros'],
  ['tecnicos', 'Técnicos'],
  ['arbitros', 'Árbitros'],
  ['recordes', 'Recordes'],
  ['jogos', 'Jogos'],
];

function useRota(): string[] {
  const ler = () => window.location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const [rota, setRota] = useState(ler);
  useEffect(() => {
    const f = () => {
      setRota(ler());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return rota;
}

const CHAVE_FILTROS = 'dashgalo:filtros';
function lerFiltros(anos: [number, number]): Filtros {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_FILTROS) ?? 'null');
    if (salvo && typeof salvo.de === 'number') return { ...filtrosPadrao(anos), ...salvo, ate: Math.min(salvo.ate, anos[1]) };
  } catch {
    /* armazenamento indisponível: usa o padrão */
  }
  return filtrosPadrao(anos);
}

export function App() {
  const [dados, setDados] = useState<ArquivoPartidas | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/partidas.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setDados)
      .catch((e) => setErro(String(e)));
  }, []);
  if (erro) return <Moldura><p className="vazio">Não foi possível carregar os dados ({erro}). Recarregue a página.</p></Moldura>;
  if (!dados) return <Moldura><p className="vazio">Carregando 117 anos de jogos…</p></Moldura>;
  return <Painel dados={dados} />;
}

function Painel({ dados }: { dados: ArquivoPartidas }) {
  const todas = dados.partidas;
  const anos = useMemo<[number, number]>(() => [todas[0].ano, todas[todas.length - 1].ano], [todas]);
  const [f, setF] = useState<Filtros>(() => lerFiltros(anos));
  const definir = (novo: Filtros) => {
    setF(novo);
    try {
      localStorage.setItem(CHAVE_FILTROS, JSON.stringify(novo));
    } catch {
      /* ignora */
    }
  };
  const ps = useMemo(() => aplicarFiltros(todas, f), [todas, f]);
  const competicoes = useMemo(() => competicoesDe(todas), [todas]);
  const [aba, arg] = useRota();
  const realizadas = ps.filter((p) => p.resultado).length;

  let conteudo;
  if (aba === 'jogo') conteudo = <Ficha partida={todas.find((p: Partida) => p.id === arg)} />;
  else if (GRUPOS[aba] && arg) conteudo = <DetalheGrupo tipo={aba} chave={arg} ps={ps} />;
  else if (GRUPOS[aba]) conteudo = <ListaGrupos tipo={aba} ps={ps} />;
  else if (aba === 'publico') conteudo = <Publico ps={ps} />;
  else if (aba === 'artilheiros') conteudo = <Artilheiros ps={ps} />;
  else if (aba === 'recordes') conteudo = <Recordes ps={ps} />;
  else if (aba === 'jogos') conteudo = <Jogos ps={ps} />;
  else conteudo = <Geral ps={ps} todas={todas} />;

  return (
    <Moldura aba={aba === 'jogo' ? 'jogos' : aba} rodape={`Dados atualizados em ${fData(dados.geradoEm.slice(0, 10))}.`}>
      {aba !== 'jogo' && <BarraFiltros f={f} set={definir} anos={anos} competicoes={competicoes} total={realizadas} />}
      <main>{conteudo}</main>
    </Moldura>
  );
}

function Moldura({ children, aba, rodape }: { children: React.ReactNode; aba?: string; rodape?: string }) {
  useEffect(() => {
    document.querySelector('.nav a[aria-current="page"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [aba]);
  return (
    <>
      <header className="topo">
        <div className="topo-conteudo">
          <div className="marca">
            <h1>
              <a href="#/" style={{ textDecoration: 'none' }}>DashGalo</a>
            </h1>
            <p>Todas as partidas do Atlético Mineiro desde 1909, a partir das fichas do blog O Canto do Galo.</p>
          </div>
        </div>
      </header>
      <nav className="nav" aria-label="Seções">
        <ul>
          {ABAS.map(([id, nome]) => (
            <li key={id}>
              <a href={`#/${id}`} aria-current={aba !== undefined && aba === id ? 'page' : undefined}>{nome}</a>
            </li>
          ))}
        </ul>
      </nav>
      {aba === undefined ? <main>{children}</main> : children}
      <footer className="rodape">
        {rodape} Fonte: <a href="https://galopedia.blogspot.com/">O Canto do Galo</a>. Aproveitamento com vitória valendo 3 pontos.
      </footer>
    </>
  );
}
