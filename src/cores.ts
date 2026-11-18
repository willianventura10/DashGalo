// Tema único (escuro). Mesmos valores das variáveis CSS em estilo.css.
// V/E/D validados com o script do skill dataviz contra a superfície #161615:
// todos os pares passam na separação para daltonismo (ΔE ≥ 10) e no contraste ≥ 3:1.
// O vermelho fica acima da faixa de luminosidade de propósito: é o que afasta ele do verde para deuteranopes.
const CORES = {
  v: '#0ca30c',
  e: '#686761',
  d: '#f77474',
  serie: '#f2c230', // dourado: séries únicas (rankings, aproveitamento)
  superficie: '#161615',
  grade: '#2a2a28',
  eixo: '#3d3d39',
  texto: '#c3c2b7',
  mudo: '#9a998f',
};
export type Cores = typeof CORES;
export const useCores = (): Cores => CORES;
