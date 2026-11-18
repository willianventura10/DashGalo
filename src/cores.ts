import { useEffect, useState } from 'react';

// Paleta validada com o script do skill dataviz (V/E/D = polos azul/vermelho + neutro cinza).
const CLARO = { v: '#2a78d6', e: '#9a988f', d: '#e34948', serie: '#2a78d6', superficie: '#fcfcfb', grade: '#e1e0d9', eixo: '#c3c2b7', texto: '#52514e', mudo: '#6f6e69' };
const ESCURO = { v: '#3987e5', e: '#5e5d58', d: '#e66767', serie: '#3987e5', superficie: '#1a1a19', grade: '#2c2c2a', eixo: '#383835', texto: '#c3c2b7', mudo: '#9a998f' };
export type Cores = typeof CLARO;

const consulta = () => window.matchMedia('(prefers-color-scheme: dark)');

export function useCores(): Cores {
  const [escuro, setEscuro] = useState(() => consulta().matches);
  useEffect(() => {
    const m = consulta();
    const f = () => setEscuro(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return escuro ? ESCURO : CLARO;
}
