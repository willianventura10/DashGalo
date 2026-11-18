// Parser das fichas técnicas do blog "O Canto do Galo".
// Entrada: post bruto do feed (título, etiquetas, HTML). Saída: Partida + Ficha.
import type { Escalacao, Expulsao, Ficha, Gol, Lado, Partida, Resultado } from '../tipos';

export interface PostBruto {
  id: string;
  titulo: string;
  url: string;
  rotulos: string[];
  html: string;
}

// ---------- utilidades ----------

export const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/["“”'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const limparFim = (s: string) => s.replace(/[\s.;,]+$/, '').trim();
const vazio = (s: string | undefined | null) => !s || /^[\s?.\-–]*$/.test(s);

export function htmlParaTexto(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|h\d|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/ /g, ' ')
    .replace(/[ \t]+/g, ' ');
}

/** Divide no nível 0 de parênteses, por ";", "," e " e ". */
export function dividirLista(s: string): string[] {
  const partes: string[] = [];
  let prof = 0;
  let atual = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(') prof++;
    if (c === ')') {
      prof = Math.max(0, prof - 1);
      // Vírgula esquecida: "Fulano (10') Beltrano (20')" ou "(5'). Beltrano".
      const resto = s.slice(i + 1).match(/^\.?\s+(?=[A-Za-zÀ-ÿ"])/);
      if (prof === 0 && resto && !/^\s*e\s/.test(s.slice(i + 1))) {
        partes.push(atual + c);
        atual = '';
        i += resto[0].length;
        continue;
      }
    }
    if (prof === 0 && (c === ';' || c === ',')) {
      partes.push(atual);
      atual = '';
      continue;
    }
    if (prof === 0 && c === ' ' && s.slice(i, i + 3) === ' e ') {
      partes.push(atual);
      atual = '';
      i += 2;
      continue;
    }
    atual += c;
  }
  partes.push(atual);
  return partes.map((p) => p.trim()).filter(Boolean);
}

// ---------- título ----------

export interface Titulo {
  data: string;
  mandante: { nome: string; sigla: string | null };
  visitante: { nome: string; sigla: string | null };
  placar: [number, number] | null;
  wo: 'mandante' | 'visitante' | null;
}

function lado(s: string) {
  const m = s.trim().match(/^(.*\S)\s+([A-Z]{2,3})$/);
  return m ? { nome: m[1].trim(), sigla: m[2] } : { nome: s.trim(), sigla: null };
}

export function parseTitulo(titulo: string): Titulo | null {
  const t = titulo.replace(/\s+/g, ' ').trim();
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[-–]\s*(.+?)\s+(\d+\s*-?x-?\s*\d+|W-O|O-W|x)\s+(.+)$/);
  if (!m) return null;
  const data = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const p = m[5];
  const g = p.match(/(\d+)\s*-?x-?\s*(\d+)/);
  return {
    data,
    mandante: lado(m[4]),
    visitante: lado(m[6]),
    placar: g ? [Number(g[1]), Number(g[2])] : null,
    // "W" fica do lado do vencedor: "A W-O B" = A venceu; "A O-W B" = B venceu.
    wo: p === 'W-O' ? 'mandante' : p === 'O-W' ? 'visitante' : null,
  };
}

const ehAtletico = (nome: string) => /^at+l+[ée]tico(-b)?$/i.test(nome.trim());

/** Qual lado do título é o Atlético? Trata "Atlético PR x Atlético MG" e erros como "Atllético". */
function ladoAtletico(t: Titulo): 'mandante' | 'visitante' | null {
  const m = ehAtletico(t.mandante.nome);
  const v = ehAtletico(t.visitante.nome);
  if (m && v) {
    const peso = (s: Titulo['mandante']) => (s.sigla === 'MG' ? 2 : 0) + (/-b$/i.test(s.nome) ? 0 : 1);
    return peso(t.mandante) >= peso(t.visitante) ? 'mandante' : 'visitante';
  }
  return m ? 'mandante' : v ? 'visitante' : null;
}

// ---------- campos do corpo ----------

const CABECALHOS: Record<string, string> = {
  local: 'local',
  estadio: 'estadio',
  publico: 'publico',
  renda: 'renda',
  competicao: 'competicao',
  arbitro: 'arbitro',
  expulsao: 'expulsoes',
  expulsoes: 'expulsoes',
  expulsos: 'expulsoes',
  gol: 'gols',
  gols: 'gols',
  obs: 'obs',
};

interface Campos {
  [k: string]: string | undefined;
}
interface Bloco {
  rotulo: string;
  texto: string;
}

/** Separa o texto em campos. Linhas sem rótulo continuam o campo anterior (há fichas com quebras no meio). */
export function separarCampos(texto: string): { campos: Campos; times: Bloco[] } {
  const campos: Campos = {};
  const times: Bloco[] = [];
  let atual: { tipo: 'campo'; chave: string } | { tipo: 'time'; bloco: Bloco } | null = null;
  const anexar = (s: string) => {
    if (!atual) return;
    if (atual.tipo === 'campo') campos[atual.chave] = ((campos[atual.chave] ?? '') + ' ' + s).trim();
    else atual.bloco.texto = (atual.bloco.texto + ' ' + s).trim();
  };
  for (const linhaBruta of texto.split('\n')) {
    const linha = linhaBruta.trim();
    if (!linha) continue;
    const m = linha.match(/^([^:]{1,40}?)\s*:\s*(.*)$/);
    const chave = m ? CABECALHOS[normalizar(m[1]).replace(/\./g, '')] : undefined;
    // O OBS é texto livre: depois dele nada vira campo novo.
    if (atual?.tipo === 'campo' && atual.chave === 'obs') {
      anexar(linha);
      continue;
    }
    if (m && chave) {
      atual = { tipo: 'campo', chave };
      campos[chave] = ((campos[chave] ?? '') + ' ' + m[2]).trim();
    } else if (m && m[1] === m[1].toUpperCase() && /[A-ZÀ-Ý]/.test(m[1]) && !/^T[ÉE]C/.test(m[1])) {
      const bloco = { rotulo: m[1].trim(), texto: m[2].trim() };
      times.push(bloco);
      atual = { tipo: 'time', bloco };
    } else {
      anexar(linha);
    }
  }
  // "Público: … - Renda: …" na mesma linha.
  if (campos.publico) {
    const r = campos.publico.match(/^(.*?)\s*[-–]?\s*Renda\s*:\s*(.*)$/i);
    if (r) {
      campos.publico = r[1];
      campos.renda = campos.renda ?? r[2];
    }
  }
  return { campos, times };
}

export function parseEscalacao(texto: string): { escalacao: Escalacao | null; tecnico: string | null } {
  let corpo = texto;
  let tecnico: string | null = null;
  const t = corpo.match(/\s*[-–]?\s*T[ée]c(?:nico)?\.?\s*:\s*(.*)$/i);
  if (t) {
    corpo = corpo.slice(0, t.index);
    tecnico = vazio(t[1]) ? null : limparFim(t[1]);
  }
  corpo = limparFim(corpo);
  if (vazio(corpo)) return { escalacao: null, tecnico };
  const titulares: string[] = [];
  const substituicoes: { sai: string; entra: string }[] = [];
  for (const item of dividirLista(corpo)) {
    const nome = limparFim(item.replace(/\(.*$/, ''));
    if (vazio(nome)) continue;
    titulares.push(nome);
    // "(A)" ou "(A) (B)" ou "(A/B)": cada um entra no lugar do anterior.
    const entraram = [...item.matchAll(/\(([^()]*)\)/g)]
      .flatMap((x) => x[1].split(/\s*\/\s*/))
      .map((s) => limparFim(s.replace(/\s*[-–]?\s*\d+\s*['’]/g, '')))
      .filter((s) => !vazio(s));
    let sai = nome;
    for (const entra of entraram) {
      substituicoes.push({ sai, entra });
      sai = entra;
    }
  }
  return { escalacao: titulares.length ? { titulares, substituicoes } : null, tecnico };
}

const TIPOS_GOL: [RegExp, Gol['tipo']][] = [
  [/p[êe]nalt[iy]|penalty/i, 'penalti'],
  [/contra/i, 'contra'],
  [/falta/i, 'falta'],
  [/ol[íi]mpico/i, 'olimpico'],
  [/bicicleta/i, 'bicicleta'],
];

/** Gols como escritos na ficha, ainda sem lado. */
export function parseGols(texto: string): Omit<Gol, 'lado'>[] {
  const gols: Omit<Gol, 'lado'>[] = [];
  const t = limparFim(texto);
  if (vazio(t)) return gols;
  for (const item of dividirLista(t)) {
    const nomeBruto = limparFim(item.replace(/\(.*$/, ''));
    const jogador = vazio(nomeBruto) ? null : nomeBruto;
    const anot = item.match(/\((.*)\)/)?.[1];
    if (!anot) {
      gols.push({ jogador, minuto: null, tipo: 'normal' });
      continue;
    }
    // "(2)" ou "(2 - penaltys)": quantidade sem minutos (número pequeno, sem apóstrofo).
    const qtd = anot.match(/^\s*(\d+)\s*(?:[-–]\s*(.*))?$/);
    if (qtd && Number(qtd[1]) <= 12) {
      const tipo = TIPOS_GOL.find(([re]) => re.test(qtd[2] ?? ''))?.[1] ?? 'normal';
      for (let i = 0; i < Number(qtd[1]); i++) gols.push({ jogador, minuto: null, tipo });
      continue;
    }
    // Partes sem número ("contra", "penalty") modificam o gol vizinho.
    const desteItem: Omit<Gol, 'lado'>[] = [];
    let pendente: Gol['tipo'] | null = null;
    for (const parte of anot.split(/\s*[,;]\s*|\s+e\s+/)) {
      if (!parte.trim()) continue;
      const tipo = TIPOS_GOL.find(([re]) => re.test(parte))?.[1] ?? null;
      if (!/\d/.test(parte)) {
        if (desteItem.length && tipo) desteItem[desteItem.length - 1].tipo = tipo;
        else if (tipo) pendente = tipo;
        else desteItem.push({ jogador, minuto: null, tipo: 'normal' });
        continue;
      }
      // "2º tempo"/"1ºt": tempo, não minuto.
      const min = /\d+\s*[ºª°]/.test(parte) ? null : parte.match(/(\d+)/);
      desteItem.push({ jogador, minuto: min ? Number(min[1]) : null, tipo: tipo ?? pendente ?? 'normal' });
      pendente = null;
    }
    if (!desteItem.length) desteItem.push({ jogador, minuto: null, tipo: pendente ?? 'normal' });
    gols.push(...desteItem);
  }
  return gols;
}

function parseExpulsoes(texto: string): { jogador: string; minuto: number | null; sigla: string | null }[] {
  const t = limparFim(texto);
  if (vazio(t)) return [];
  return dividirLista(t)
    .map((item) => {
      const jogador = limparFim(item.replace(/\(.*$/, ''));
      const anot = item.match(/\(([^)]*)\)/)?.[1] ?? '';
      const sigla = anot.match(/^\s*([A-Za-zÀ-ÿ]+)/)?.[1] ?? null;
      const min = anot.match(/(\d+)\s*['’]?/);
      return { jogador, minuto: min ? Number(min[1]) : null, sigla };
    })
    .filter((e) => !vazio(e.jogador));
}

function parseNumeroBR(s: string): number {
  return Number(s.replace(/\./g, '').replace(',', '.'));
}

export function parsePublico(texto: string | undefined) {
  const vazioRes = { publico: null, publicoTipo: null, publicoEstimado: false } as const;
  if (!texto) return vazioRes;
  const m = texto.match(/(\d[\d.\s]*\d|\d)\s*(pagantes|presentes)?/i);
  if (!m) return vazioRes;
  const n = Number(m[1].replace(/[.\s]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return vazioRes;
  const tipo = (m[2]?.toLowerCase() as 'pagantes' | 'presentes' | undefined) ?? (/pagantes/i.test(texto) ? 'pagantes' : 'presentes');
  return { publico: n, publicoTipo: tipo, publicoEstimado: /estimad/i.test(texto) };
}

const MOEDAS: [RegExp, string][] = [
  [/NCr\$/i, 'NCr$'],
  [/NCz\$/i, 'NCz$'],
  [/Cr\$/i, 'Cr$'],
  [/Cz\$/i, 'Cz$'],
  [/US\$/i, 'US$'],
  [/R\$/i, 'R$'],
];

export function parseRenda(texto: string | undefined): Partida['renda'] {
  if (!texto) return null;
  // Réis: "1:500$000" = 1 conto e 500 mil-réis.
  const reis = texto.match(/(?:(\d+):)?(\d{1,3})\$(\d{3})/);
  const moeda = MOEDAS.find(([re]) => re.test(texto))?.[1];
  if (!moeda && reis) {
    const valorReis = Number(reis[1] ?? 0) * 1_000_000 + Number(reis[2]) * 1000 + Number(reis[3]);
    return valorReis > 0 ? { moeda: 'Rs', centavos: valorReis * 100 } : null;
  }
  if (!moeda) return null;
  const m = texto.match(/\d[\d.]*(?:,\d{1,2})?/);
  if (!m) return null;
  const v = parseNumeroBR(m[0]);
  if (!Number.isFinite(v) || v <= 0) return null;
  return { moeda, centavos: Math.round(v * 100) };
}

// ---------- etiquetas ----------

const COMPETICOES = new Set([
  'Cmp Mineiro',
  'Cmp Brasileiro',
  'Cmp Brasileiro B',
  'Amistoso',
  'Torneio Amistoso',
  'Copa do Brasil',
  'Torneio Oficial',
  'Libertadores',
  'Copa Sul-Americana',
  'Copa Conmebol',
  'Taça Minas Gerais',
  'Taça Brasil',
  'Taça Belo Horizonte',
  'Copa Mercosul',
]);
export const AMISTOSOS = new Set(['Amistoso', 'Torneio Amistoso']);

const PAISES = new Set(
  'Argentina,Colômbia,Uruguai,Paraguai,Itália,Alemanha,Espanha,Venezuela,Chile,Bolívia,Peru,Equador,México,Holanda,Portugal,França,Indonésia,Estados Unidos,China,Romênia,Japão,Camarões,Suiça,Suíça,Bélgica,Iugoslávia,Austria,Áustria,Rússia,Escócia,Qatar,Catar,Bulgária,União Soviética,Hungria,Kuwait,Polônia,Jamaica,Marrocos,Argélia,Bahreim,Bahrein,Suécia,Hong Kong,Ucrânia,Ilhas Faroe,Luxemburgo,Arábia Saudita,Inglaterra,Vietnã,Tchecoslováquia,Dinamarca,Grécia,Turquia,Egito,Coreia do Sul,Costa Rica,Honduras,Canadá,Irlanda,Noruega,Croácia,Sérvia,Angola,Nigéria,Gana,Emirados Árabes'.split(
    ',',
  ),
);
const META = new Set(['(incompleta)', 'WOs', 'BRASIL']);
const UFS = new Set(
  'AC,AL,AP,AM,BA,CE,DF,ES,GO,MA,MT,MS,MG,PA,PB,PR,PE,PI,RJ,RN,RS,RO,RR,SC,SP,SE,TO'.split(','),
);

export interface Etiquetas {
  competicao: string | null;
  advRotulo: string | null; // "MG Cruzeiro" (específico) ou null
  pais: string | null;
  estadio: string | null;
  incompleta: boolean;
}

export function classificarEtiquetas(rotulos: string[]): Etiquetas {
  const r: Etiquetas = { competicao: null, advRotulo: null, pais: null, estadio: null, incompleta: false };
  for (const e of rotulos) {
    if (/^\d{4}$/.test(e)) continue;
    if (e === '(incompleta)') r.incompleta = true;
    if (META.has(e)) continue;
    if (COMPETICOES.has(e)) r.competicao = e;
    else if (PAISES.has(e)) r.pais = e;
    else if (/^(Outros|WD) /.test(e)) continue;
    else if (/^[A-Z]{2} /.test(e) && UFS.has(e.slice(0, 2))) {
      if (!/^[A-Z]{2} (Outros|Todos)\b/.test(e)) r.advRotulo = e;
    } else r.estadio = e === 'Alameda' ? 'Alamêda' : e;
  }
  return r;
}

// ---------- atribuição de lado ----------

function nomesDe(e: Escalacao | null): Set<string> {
  const s = new Set<string>();
  if (!e) return s;
  for (const n of e.titulares) s.add(normalizar(n));
  for (const x of e.substituicoes) s.add(normalizar(x.entra));
  return s;
}

function ladoDoJogador(nome: string, atl: Set<string>, adv: Set<string>): Lado {
  const n = normalizar(nome);
  const emA = atl.has(n);
  const emD = adv.has(n);
  if (emA !== emD) return emA ? 'A' : 'D';
  if (emA && emD) return null;
  // Nome parcial ("Anibal Machado" x "Aníbal Machado Pingo").
  const parcial = (s: Set<string>) => [...s].some((x) => x.length > 3 && n.length > 3 && (x.startsWith(n) || n.startsWith(x)));
  const pA = parcial(atl);
  const pD = parcial(adv);
  return pA !== pD ? (pA ? 'A' : 'D') : null;
}

function atribuirGols(
  brutos: Omit<Gol, 'lado'>[],
  atl: Set<string>,
  adv: Set<string>,
  golsPro: number | null,
  golsContra: number | null,
): Gol[] {
  const gols: Gol[] = brutos.map((g) => {
    if (!g.jogador) return { ...g, lado: null };
    const l = ladoDoJogador(g.jogador, atl, adv);
    const lado: Lado = g.tipo === 'contra' && l ? (l === 'A' ? 'D' : 'A') : l;
    return { ...g, lado };
  });
  if (golsPro == null || golsContra == null) return gols;
  // Completa pelo placar: se um lado já está fechado, o resto é do outro.
  const restA = golsPro - gols.filter((g) => g.lado === 'A').length;
  const restD = golsContra - gols.filter((g) => g.lado === 'D').length;
  const semLado = gols.filter((g) => g.lado === null);
  if (semLado.length && restA >= 0 && restD >= 0) {
    if (restD === 0 && restA === semLado.length) semLado.forEach((g) => (g.lado = 'A'));
    else if (restA === 0 && restD === semLado.length) semLado.forEach((g) => (g.lado = 'D'));
  }
  return gols;
}

function competicaoDoTexto(nome: string | undefined): string {
  const base = nome?.split('/')[0].trim();
  if (!base) return 'Outra';
  return base.replace(/^Campeonato Mineiro$/i, 'Cmp Mineiro').replace(/^Campeonato Brasileiro$/i, 'Cmp Brasileiro');
}

// ---------- montagem ----------

export function parsePost(post: PostBruto): { partida: Partida; ficha: Ficha } | null {
  const tit = parseTitulo(post.titulo);
  if (!tit) return null;
  const qual = ladoAtletico(tit);
  if (!qual) return null;
  const casa = qual === 'mandante';
  const nosso = casa ? tit.mandante : tit.visitante;
  const eles = casa ? tit.visitante : tit.mandante;

  const texto = htmlParaTexto(post.html);
  const { campos, times } = separarCampos(texto);
  const et = classificarEtiquetas(post.rotulos);

  // Bloco do Atlético: rótulo exato; senão, pela ordem do título.
  const rotuloNosso = /-B/.test(nosso.nome) ? /^ATL[ÉE]TICO(-B|-MG)?$/ : /^ATL[ÉE]TICO(-MG)?$/;
  let iAtl = times.findIndex((b) => rotuloNosso.test(b.rotulo));
  if (iAtl < 0 && times.length === 2) iAtl = casa ? 0 : 1;
  const blocoAtl = iAtl >= 0 ? times[iAtl] : null;
  const blocoAdv = times.find((_, i) => i !== iAtl) ?? null;
  const eAtl = blocoAtl ? parseEscalacao(blocoAtl.texto) : { escalacao: null, tecnico: null };
  const eAdv = blocoAdv ? parseEscalacao(blocoAdv.texto) : { escalacao: null, tecnico: null };

  let golsPro: number | null = null;
  let golsContra: number | null = null;
  let resultado: Resultado | null = null;
  if (tit.placar) {
    [golsPro, golsContra] = casa ? tit.placar : [tit.placar[1], tit.placar[0]];
    resultado = golsPro > golsContra ? 'V' : golsPro < golsContra ? 'D' : 'E';
  } else if (tit.wo) {
    resultado = (tit.wo === 'mandante') === casa ? 'V' : 'D';
  }

  const nA = nomesDe(eAtl.escalacao);
  const nD = nomesDe(eAdv.escalacao);
  const gols = atribuirGols(parseGols(campos.gols ?? ''), nA, nD, golsPro, golsContra);

  const nomeAdvNorm = normalizar(eles.nome);
  const expulsoes: Expulsao[] = parseExpulsoes(campos.expulsoes ?? '').map((e) => {
    let l = ladoDoJogador(e.jogador, nA, nD);
    if (!l && e.sigla) {
      const s = normalizar(e.sigla);
      const a = 'atletico'.startsWith(s);
      const d = nomeAdvNorm.startsWith(s);
      if (a !== d) l = a ? 'A' : 'D';
    }
    return { jogador: e.jogador, minuto: e.minuto, lado: l };
  });

  const local = campos.local ? limparFim(campos.local) : null;
  const lm = local?.match(/^(.*?),\s*([^,]+)$/);
  const comp = campos.competicao ? limparFim(campos.competicao) : null;
  const cm = comp?.match(/^(.*?)(?:\s*\((.*)\))?$/);
  const arb = campos.arbitro ? limparFim(campos.arbitro) : null;
  const arbSemNum = arb?.replace(/\s*\(\d+[ªº°]?\)/g, '').trim() ?? null;
  const am = arbSemNum?.match(/^(.*?),\s*([^,]+)$/);
  const arbitro = am ? am[1] : arbSemNum;
  const estadioTexto = campos.estadio ? limparFim(campos.estadio) : null;
  const pais = et.pais ?? (eles.sigla && UFS.has(eles.sigla) ? 'Brasil' : eles.sigla ? eles.sigla : 'Brasil');

  const partida: Partida = {
    id: post.id,
    url: post.url,
    data: tit.data,
    ano: Number(tit.data.slice(0, 4)),
    mando: casa ? 'casa' : 'fora',
    advId: et.advRotulo ?? `${et.pais ?? eles.sigla ?? '?'} | ${eles.nome}`,
    adversario: eles.nome,
    advSigla: eles.sigla,
    advPais: pais,
    golsPro,
    golsContra,
    resultado,
    wo: tit.wo !== null,
    estadio: et.estadio && et.estadio !== 'Não identificado' ? et.estadio : vazio(estadioTexto) ? null : estadioTexto,
    cidade: lm ? lm[1].trim() : vazio(local) ? null : local,
    uf: lm ? lm[2].trim() : null,
    competicao: et.competicao ?? competicaoDoTexto(cm?.[1]),
    competicaoNome: cm ? cm[1].trim() : null,
    fase: cm?.[2]?.trim() || null,
    amistoso: AMISTOSOS.has(et.competicao ?? '') || /amistoso/i.test(comp ?? ''),
    atleticoB: /-B/.test(nosso.nome),
    ...parsePublico(campos.publico),
    renda: parseRenda(campos.renda),
    arbitro: vazio(arbitro) || /n[ãa]o identificado/i.test(arbitro ?? '') ? null : arbitro,
    arbitroOrigem: am ? limparFim(am[2]) : null,
    tecnico: eAtl.tecnico,
    tecnicoAdv: eAdv.tecnico,
    gols,
    expulsoes,
    incompleta: et.incompleta,
  };
  const ficha: Ficha = {
    local,
    estadioTexto,
    publicoTexto: campos.publico ? limparFim(campos.publico) || null : null,
    rendaTexto: campos.renda ? limparFim(campos.renda) || null : null,
    competicaoTexto: comp,
    arbitroTexto: arb,
    atletico: eAtl.escalacao,
    adversario: eAdv.escalacao,
    advRotulo: blocoAdv?.rotulo ?? null,
    golsTexto: campos.gols ? limparFim(campos.gols) || null : null,
    obs: campos.obs && !vazio(campos.obs) ? campos.obs.trim() : null,
  };
  return { partida, ficha };
}
