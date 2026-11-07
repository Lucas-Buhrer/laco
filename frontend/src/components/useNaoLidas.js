import { useEffect, useState } from 'react';
import { api } from '../api/api.js';

// Quantos avisos ainda não foram lidos. Atualiza ao abrir a tela e quando a lista de avisos muda.
export default function useNaoLidas() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const carregar = () => api.get('/notificacoes').then((d) => setN(d.nao_lidas)).catch(() => {});
    carregar();
    window.addEventListener('avisos-mudaram', carregar);
    return () => window.removeEventListener('avisos-mudaram', carregar);
  }, []);
  return n;
}
