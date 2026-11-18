import { useEffect, useState } from 'react';
import { fData, fDiaSemana, fInt } from '../formato';
import type { ArquivoFichas, Escalacao, Ficha as TFicha, Gol, Partida } from '../tipos';
import { linkGrupo, placar, Res } from '../ui/comum';
import { nomeCompeticao } from '../ui/Filtros';

let cache: Promise<ArquivoFichas> | null = null;
const carregarFichas = () =>
  (cache ??= fetch(`${import.meta.env.BASE_URL}data/fichas.json`).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }));

export function Ficha({ partida }: { partida: Partida | undefined }) {
  const [ficha, setFicha] = useState<TFicha | null | 'erro'>(null);
  useEffect(() => {
    if (!partida) return;
    carregarFichas()
      .then((f) => setFicha(f[partida.id] ?? 'erro'))
      .catch(() => {
        cache = null;
        setFicha('erro');
      });
  }, [partida]);
  if (!partida) return <p className="vazio">Jogo não encontrado. Volte para a <a href="#/jogos">lista de jogos</a>.</p>;
  const p = partida;
  const casa = p.mando === 'casa';
  const f = ficha && ficha !== 'erro' ? ficha : null;
  const golsDe = (lado: 'A' | 'D') => p.gols.filter((g) => g.lado === lado);
  const semLado = p.gols.filter((g) => !g.lado);
  return (
    <>
      <div className="cabeca">
        <a className="peq" href="#/jogos">Jogos</a>
        <p className="sec">
          {fDiaSemana(p.data)}, {fData(p.data)}. {p.competicaoNome ?? nomeCompeticao(p.competicao)}
          {p.fase ? ` (${p.fase})` : ''}
        </p>
        <div className="ficha-placar">
          <h2 className="times">
            {casa ? 'Atlético' : p.adversario} {placar(p)} {casa ? p.adversario : 'Atlético'}
          </h2>
          <Res r={p.resultado} />
        </div>
        {p.atleticoB && <p className="aviso">Jogo do time B do Atlético.</p>}
        {p.incompleta && <p className="aviso">O blog marca esta ficha como incompleta.</p>}
      </div>
      <section className="cartao">
        <dl className="dl">
          <dt>Local</dt>
          <dd>
            {p.estadio ? <a href={linkGrupo('estadios', p.estadio)}>{f?.estadioTexto ?? p.estadio}</a> : (f?.estadioTexto ?? '–')}
            {f?.local ? `, ${f.local}` : ''}
          </dd>
          <dt>Público</dt>
          <dd>{p.publico ? `${fInt(p.publico)} ${p.publicoTipo}${p.publicoEstimado ? ' (estimado)' : ''}` : (f?.publicoTexto ?? 'Não informado')}</dd>
          <dt>Renda</dt>
          <dd>{f?.rendaTexto && /\d/.test(f.rendaTexto) ? f.rendaTexto : 'Não informada'}</dd>
          <dt>Árbitro</dt>
          <dd>{p.arbitro ? `${p.arbitro}${p.arbitroOrigem ? `, ${p.arbitroOrigem}` : ''}` : 'Não identificado'}</dd>
          <dt>Adversário</dt>
          <dd><a href={linkGrupo('adversarios', p.advId)}>Retrospecto contra {p.adversario}</a></dd>
          {p.expulsoes.length > 0 && (
            <>
              <dt>Expulsões</dt>
              <dd>
                {p.expulsoes
                  .map((e) => `${e.jogador} (${e.lado === 'A' ? 'Atlético' : e.lado === 'D' ? p.adversario : '?'}${e.minuto ? `, ${e.minuto}'` : ''})`)
                  .join('; ')}
              </dd>
            </>
          )}
        </dl>
      </section>
      {p.resultado && (
        <section className="cartao">
          <h3 style={{ marginBottom: 8 }}>Gols</h3>
          {p.gols.length === 0 ? (
            <p className="sec">{p.golsPro || p.golsContra ? 'Autores não identificados na ficha.' : 'Sem gols.'}</p>
          ) : (
            <div className="grade-2">
              <ListaGols titulo="Atlético" gols={golsDe('A')} />
              <ListaGols titulo={p.adversario} gols={golsDe('D')} />
              {semLado.length > 0 && <ListaGols titulo="Lado não identificado" gols={semLado} />}
            </div>
          )}
        </section>
      )}
      {ficha === null && <p className="sec">Carregando escalações…</p>}
      {ficha === 'erro' && <p className="aviso">Não foi possível carregar as escalações. Verifique a conexão e abra o jogo de novo.</p>}
      {f && (f.atletico || f.adversario) && (
        <div className="grade-2">
          <Time titulo="Atlético" e={f.atletico} tecnico={p.tecnico} />
          <Time titulo={p.adversario} e={f.adversario} tecnico={p.tecnicoAdv} />
        </div>
      )}
      {f?.obs && (
        <section className="cartao">
          <h3 style={{ marginBottom: 6 }}>Observações</h3>
          <p style={{ maxWidth: '72ch' }}>{f.obs}</p>
        </section>
      )}
      <p className="peq">
        <a href={p.url} target="_blank" rel="noopener noreferrer">Abrir a ficha no blog O Canto do Galo</a>
      </p>
    </>
  );
}

const TIPO: Record<Gol['tipo'], string> = { normal: '', penalti: 'pênalti', contra: 'contra', falta: 'falta', olimpico: 'olímpico', bicicleta: 'bicicleta' };

function ListaGols({ titulo, gols }: { titulo: string; gols: Gol[] }) {
  return (
    <div>
      <p className="sec peq">{titulo}</p>
      {gols.length ? (
        <ul style={{ margin: '4px 0 0', paddingLeft: '1.1rem' }}>
          {gols.map((g, i) => (
            <li key={i}>
              {g.jogador ?? 'Autor desconhecido'}
              {g.minuto != null ? ` ${g.minuto}'` : ''}
              {TIPO[g.tipo] ? ` (${TIPO[g.tipo]})` : ''}
            </li>
          ))}
        </ul>
      ) : (
        <p>–</p>
      )}
    </div>
  );
}

function Time({ titulo, e, tecnico }: { titulo: string; e: Escalacao | null; tecnico: string | null }) {
  return (
    <section className="cartao escalacao">
      <h3 style={{ marginBottom: 8 }}>{titulo}</h3>
      {e ? (
        <>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {e.titulares.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
          {e.substituicoes.length > 0 && (
            <>
              <p className="sec peq" style={{ marginTop: 10 }}>Substituições</p>
              <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {e.substituicoes.map((s, i) => (
                  <li key={i}>
                    {s.entra} no lugar de {s.sai}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : (
        <p className="sec">Escalação não registrada.</p>
      )}
      <p className="sec" style={{ marginTop: 10 }}>Técnico: {tecnico ?? 'não registrado'}</p>
    </section>
  );
}
