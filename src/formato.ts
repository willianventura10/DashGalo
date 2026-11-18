const int = new Intl.NumberFormat('pt-BR');
const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1, minimumFractionDigits: 1 });
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const compacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

export const fInt = (n: number | null | undefined) => (n == null ? '–' : int.format(n));
export const fPct = (fracao: number) => pct.format(fracao);
export const fCompacto = (n: number) => (Math.abs(n) >= 10_000 ? compacto.format(n) : int.format(n));
export const fData = (iso: string) => iso.split('-').reverse().join('/');
export const fReal = (centavos: number) => brl.format(centavos / 100);
export const fSaldo = (n: number) => (n > 0 ? `+${int.format(n)}` : int.format(n));

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
export const fDiaSemana = (iso: string) => DIAS[new Date(`${iso}T12:00:00`).getDay()];
export const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
