import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';

function quando(iso) {
  const d = new Date(iso);
  const mesmoDia = d.toDateString() === new Date().toDateString();
  return mesmoDia
    ? `hoje, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    : d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

// Desenho: docs/telas/M17. Serve a família (celular) e a clínica (computador).
export default function Avisos() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const ehFamilia = usuario.papel === 'RESPONSAVEL';

  function carregar() {
    api.get('/notificacoes').then(setDados).catch((e) => setErro(e.message));
  }
  useEffect(carregar, []);

  async function abrir(a) {
    try {
      if (!a.lida) await api.post(`/notificacoes/${a.id}/ler`, {});
    } catch { /* se não marcar, só segue para a tela */ }
    window.dispatchEvent(new Event('avisos-mudaram'));
    if (a.link) navegar(a.link);
    else carregar();
  }

  async function lerTodas() {
    await api.post('/notificacoes/ler-todas', {});
    window.dispatchEvent(new Event('avisos-mudaram'));
    carregar();
  }

  return (
    <>
      {ehFamilia && <Link to="/familia/mais" className="voltar">Mais</Link>}
      <h1>Avisos</h1>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {dados && dados.nao_lidas > 0 && <button className="botao-sec" onClick={lerTodas}>Marcar todos como lidos</button>}
      {dados && dados.avisos.length === 0 && <p className="vazio">Nenhum aviso por enquanto.</p>}
      {dados && dados.avisos.map((a) => (
        <button key={a.id} className={`cartao aviso-item ${a.lida ? '' : 'nao-lido'}`} onClick={() => abrir(a)}>
          <span>{a.texto}</span>
          <time>{quando(a.criada_em)}</time>
        </button>
      ))}
    </>
  );
}
