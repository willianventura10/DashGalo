// Esquema dos dados publicados em public/data/*.json.

export type Resultado = 'V' | 'E' | 'D';
/** Lado de um gol/expulsão: Atlético, adversário ou não identificado. */
export type Lado = 'A' | 'D' | null;

export interface Gol {
  jogador: string | null; // null = autor desconhecido ("?")
  minuto: number | null;
  tipo: 'normal' | 'penalti' | 'contra' | 'falta' | 'olimpico' | 'bicicleta';
  /** Time que marcou (no placar). Gol contra conta para o time adversário do autor. */
  lado: Lado;
}

export interface Expulsao {
  jogador: string;
  minuto: number | null;
  lado: Lado;
}

export interface Partida {
  id: string;
  url: string;
  data: string; // aaaa-mm-dd
  ano: number;
  mando: 'casa' | 'fora'; // casa = Atlético citado primeiro no título
  advId: string;
  adversario: string;
  advSigla: string | null; // UF ou país do título (MG, ARG…)
  advPais: string; // "Brasil" ou país da etiqueta
  golsPro: number | null;
  golsContra: number | null;
  resultado: Resultado | null; // null = jogo ainda não realizado
  wo: boolean;
  estadio: string | null;
  cidade: string | null;
  uf: string | null;
  competicao: string; // categoria da etiqueta (Cmp Mineiro, Libertadores…)
  competicaoNome: string | null; // texto da ficha (Copa do Brasil/2026)
  fase: string | null;
  amistoso: boolean;
  atleticoB: boolean;
  publico: number | null;
  publicoTipo: 'pagantes' | 'presentes' | null;
  publicoEstimado: boolean;
  renda: { moeda: string; centavos: number } | null;
  arbitro: string | null;
  arbitroOrigem: string | null;
  tecnico: string | null;
  tecnicoAdv: string | null;
  gols: Gol[];
  expulsoes: Expulsao[];
  incompleta: boolean;
}

export interface Escalacao {
  titulares: string[];
  substituicoes: { sai: string; entra: string }[];
}

export interface Ficha {
  local: string | null;
  estadioTexto: string | null;
  publicoTexto: string | null;
  rendaTexto: string | null;
  competicaoTexto: string | null;
  arbitroTexto: string | null;
  atletico: Escalacao | null;
  adversario: Escalacao | null;
  advRotulo: string | null; // nome do time como aparece na ficha (ex.: GRÊMIO)
  golsTexto: string | null;
  obs: string | null;
}

export interface ArquivoPartidas {
  geradoEm: string;
  fonte: string;
  partidas: Partida[];
}

export type ArquivoFichas = Record<string, Ficha>;
