import { useState } from 'react';
import { porPeriodo, proximoJogo, realizadas, resumo } from '../calc';
import { fData, fDiaSemana, fInt, fPct, hojeISO } from '../formato';
import type { Partida } from '../tipos';
import { BarraVED, CasaFora, Cartao, ListaJogos, Numeros, Tabela, linkJogo } from '../ui/comum';
import { GraficoAprov, GraficoVED } from '../ui/graficos';
import { nomeCompeticao } from '../ui/Filtros';

export function Geral({ ps, todas }: { ps: Partida[]; todas: Partida[] }) {
  const r = resumo(ps);
  const jogos = realizadas(ps);
  const anos = jogos.length ? jogos[jogos.length - 1].ano - jogos[0].ano + 1 : 0;
  const [passo, setPasso] = useState<'ano' | 'decada' | null>(null);
  const passoEfetivo = passo ?? (anos > 40 ? 'decada' : 'ano');
  const periodos = porPeriodo(ps, passoEfetivo);
  const proximo = proximoJogo(todas, hojeISO());

  const alternar = (
    <button className="botao-texto peq" onClick={() => setPasso(passoEfetivo === 'ano' ? 'decada' : 'ano')}>
      {passoEfetivo === 'ano' ? 'Por década' : 'Por ano'}
    </button>
  );
  const tabelaPeriodos = (
    <Tabela
      rotulo="Retrospecto por período"
      linhas={periodos}
      chave={(p) => String(p.periodo)}
      colunas={[
        { titulo: passoEfetivo === 'ano' ? 'Ano' : 'Década', valor: (p) => p.periodo },
        { titulo: 'J', valor: (p) => p.j, numerica: true },
        { titulo: 'V', valor: (p) => p.v, numerica: true },
        { titulo: 'E', valor: (p) => p.e, numerica: true },
        { titulo: 'D', valor: (p) => p.d, numerica: true },
        { titulo: 'Aprov.', valor: (p) => p.aprov, exibir: (p) => fPct(p.aprov), numerica: true },
      ]}
    />
  );
  const rotuloPasso = passoEfetivo === 'ano' ? 'por ano' : 'por década';

  return (
    <>
      {proximo && (
        <section className="cartao" aria-label="Próximo jogo">
          <p className="sec peq">Próximo jogo</p>
          <h2 style={{ marginTop: 2 }}>
            <a href={linkJogo(proximo.id)} style={{ textDecoration: 'none' }}>
              {proximo.mando === 'casa' ? `Atlético × ${proximo.adversario}` : `${proximo.adversario} × Atlético`}
            </a>
          </h2>
          <p className="sec">
            {fDiaSemana(proximo.data)}, {fData(proximo.data)}. {proximo.competicaoNome ?? nomeCompeticao(proximo.competicao)}
            {proximo.fase ? ` (${proximo.fase})` : ''}, {proximo.estadio}
            {proximo.cidade ? `, ${proximo.cidade}` : ''}.
          </p>
        </section>
      )}
      <Numeros r={r} />
      <section className="cartao">
        <h3 style={{ marginBottom: 12 }}>Vitórias, empates e derrotas</h3>
        <BarraVED r={r} />
      </section>
      <CasaFora ps={ps} />
      <div className="grade-2">
        <Cartao titulo={`Resultados ${rotuloPasso}`} sub="Quantidade de jogos" tabela={tabelaPeriodos} acoes={alternar}>
          <GraficoVED dados={periodos} passo={passoEfetivo} />
        </Cartao>
        <Cartao titulo={`Aproveitamento ${rotuloPasso}`} sub="Pontos ganhos sobre os disputados, com vitória valendo 3" tabela={tabelaPeriodos} acoes={alternar}>
          <GraficoAprov dados={periodos} passo={passoEfetivo} />
        </Cartao>
      </div>
      <Cartao titulo="Últimos jogos" sub={`${fInt(jogos.length)} jogos no recorte`}>
        <ListaJogos jogos={[...jogos].reverse()} limite={10} />
      </Cartao>
    </>
  );
}
