import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Periodo } from '../calc';
import { useCores } from '../cores';
import { fCompacto, fInt, fPct } from '../formato';

const eixo = (c: ReturnType<typeof useCores>) => ({
  stroke: c.eixo,
  tick: { fill: c.mudo, fontSize: 12 },
  tickLine: false,
});

interface DicaProps {
  active?: boolean;
  label?: string | number;
  payload?: { payload: Record<string, number | string> }[];
}

const rotuloPeriodo = (p: number, passo: 'ano' | 'decada') => (passo === 'ano' ? String(p) : `${p}s`);

/** Colunas empilhadas de vitórias, empates e derrotas por período. */
export function GraficoVED({ dados, passo }: { dados: Periodo[]; passo: 'ano' | 'decada' }) {
  const c = useCores();
  const series = [
    { k: 'v', nome: 'Vitórias', cor: c.v },
    { k: 'e', nome: 'Empates', cor: c.e },
    { k: 'd', nome: 'Derrotas', cor: c.d },
  ] as const;
  const Dica = ({ active, payload }: DicaProps) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as unknown as Periodo;
    return (
      <div className="dica">
        <div style={{ marginBottom: 4 }}>{passo === 'ano' ? p.periodo : `Década de ${p.periodo}`}</div>
        {series.map((s) => (
          <div className="linha-dica" key={s.k}>
            <i className="traco" style={{ background: s.cor }} />
            <strong>{fInt(p[s.k])}</strong> {s.nome.toLowerCase()}
          </div>
        ))}
        <div className="mudo">{fInt(p.j)} jogos</div>
      </div>
    );
  };
  return (
    <>
      <div className="grafico">
        <ResponsiveContainer>
          <BarChart data={dados} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barCategoryGap="15%">
            <CartesianGrid vertical={false} stroke={c.grade} />
            <XAxis dataKey="periodo" {...eixo(c)} tickFormatter={(p) => rotuloPeriodo(p, passo)} minTickGap={16} />
            <YAxis {...eixo(c)} axisLine={false} allowDecimals={false} />
            <Tooltip content={<Dica />} cursor={{ fill: c.grade, opacity: 0.5 }} isAnimationActive={false} />
            {series.map((s, i) => (
              <Bar
                key={s.k}
                dataKey={s.k}
                name={s.nome}
                stackId="ved"
                fill={s.cor}
                stroke={c.superficie}
                strokeWidth={dados.length > 60 ? 0.5 : 2}
                maxBarSize={24}
                radius={i === 2 ? [4, 4, 0, 0] : 0}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="legenda">
        {series.map((s) => (
          <span key={s.k}>
            <i className="chave" style={{ background: s.cor }} />
            {s.nome}
          </span>
        ))}
      </div>
    </>
  );
}

/** Linha de aproveitamento (fração 0–1) por período. */
export function GraficoAprov({ dados, passo }: { dados: Periodo[]; passo: 'ano' | 'decada' }) {
  const c = useCores();
  const Dica = ({ active, payload }: DicaProps) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as unknown as Periodo;
    return (
      <div className="dica">
        <div>
          <strong>{fPct(p.aprov)}</strong> em {passo === 'ano' ? p.periodo : `década de ${p.periodo}`}
        </div>
        <div className="mudo">
          {fInt(p.v)}V {fInt(p.e)}E {fInt(p.d)}D em {fInt(p.j)} jogos
        </div>
      </div>
    );
  };
  return (
    <div className="grafico">
      <ResponsiveContainer>
        <LineChart data={dados} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={c.grade} />
          <XAxis dataKey="periodo" {...eixo(c)} tickFormatter={(p) => rotuloPeriodo(p, passo)} minTickGap={16} />
          <YAxis {...eixo(c)} axisLine={false} domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]} tickFormatter={(v) => `${v * 100}%`} />
          <Tooltip content={<Dica />} cursor={{ stroke: c.eixo, strokeWidth: 1 }} isAnimationActive={false} />
          <Line
            dataKey="aprov"
            stroke={c.serie}
            strokeWidth={2}
            dot={dados.length <= 20 ? { r: 4, fill: c.serie, stroke: c.superficie, strokeWidth: 2 } : false}
            activeDot={{ r: 5, fill: c.serie, stroke: c.superficie, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barras horizontais de uma série (rankings). Valor na ponta da barra. */
export function GraficoRanking({
  itens,
  formato = fInt,
  dica,
}: {
  itens: { nome: string; valor: number; detalhe?: string }[];
  formato?: (n: number) => string;
  dica?: string;
}) {
  const c = useCores();
  const largura = Math.min(180, Math.max(90, ...itens.map((i) => i.nome.length * 7)));
  const Dica = ({ active, payload }: DicaProps) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as { nome: string; valor: number; detalhe?: string };
    return (
      <div className="dica">
        <div>
          <strong>{formato(p.valor)}</strong> {dica}
        </div>
        <div>{p.nome}</div>
        {p.detalhe && <div className="mudo">{p.detalhe}</div>}
      </div>
    );
  };
  return (
    <div style={{ width: '100%', height: itens.length * 30 + 16 }}>
      <ResponsiveContainer>
        <BarChart data={itens} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }}>
          <XAxis type="number" hide domain={[0, 'dataMax']} />
          <YAxis
            type="category"
            dataKey="nome"
            width={largura}
            tick={{ fill: c.texto, fontSize: 13 }}
            tickLine={false}
            axisLine={{ stroke: c.eixo }}
            interval={0}
            tickFormatter={(s: string) => (s.length > 26 ? s.slice(0, 25) + '…' : s)}
          />
          <Tooltip content={<Dica />} cursor={{ fill: c.grade, opacity: 0.5 }} isAnimationActive={false} />
          <Bar dataKey="valor" fill={c.serie} barSize={18} radius={[0, 4, 4, 0]} isAnimationActive={false}>
            <LabelList dataKey="valor" position="right" formatter={(v: unknown) => formato(Number(v))} style={{ fill: c.texto, fontSize: 12 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Colunas de uma série ao longo do tempo (ex.: público médio por ano). */
export function GraficoColunas({ itens, dica }: { itens: { periodo: number; valor: number; detalhe?: string }[]; dica: string }) {
  const c = useCores();
  const Dica = ({ active, payload }: DicaProps) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as { periodo: number; valor: number; detalhe?: string };
    return (
      <div className="dica">
        <div>
          <strong>{fInt(Math.round(p.valor))}</strong> {dica}
        </div>
        <div>{p.periodo}</div>
        {p.detalhe && <div className="mudo">{p.detalhe}</div>}
      </div>
    );
  };
  return (
    <div className="grafico">
      <ResponsiveContainer>
        <BarChart data={itens} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={c.grade} />
          <XAxis dataKey="periodo" {...eixo(c)} minTickGap={16} />
          <YAxis {...eixo(c)} axisLine={false} tickFormatter={(v) => fCompacto(v)} />
          <Tooltip content={<Dica />} cursor={{ fill: c.grade, opacity: 0.5 }} isAnimationActive={false} />
          <Bar dataKey="valor" fill={c.serie} maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
