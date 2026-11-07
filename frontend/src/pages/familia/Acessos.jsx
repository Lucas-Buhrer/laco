import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api.js';
import { nomeEspecialidade } from './Solicitacoes.jsx';

// Desenho: docs/telas/M4. Revogar e mudar o escopo valem na hora (RN-03).
export default function Acessos() {
  const [vinculos, setVinculos] = useState(null);
  const [erro, setErro] = useState('');
  const [confirmando, setConfirmando] = useState(null); // id do vínculo a revogar

  function carregar() {
    api.get('/vinculos').then(setVinculos).catch((e) => setErro(e.message));
  }
  useEffect(carregar, []);

  async function revogar(v) {
    setErro('');
    try {
      await api.post(`/vinculos/${v.id}/revogar`);
      setConfirmando(null);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function mudarEscopo(v, campo, valor) {
    setErro('');
    try {
      await api.put(`/vinculos/${v.id}/escopo`, { [campo]: valor });
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  if (!vinculos && !erro) return <p className="carregando">Carregando…</p>;
  const aprovados = (vinculos || []).filter((v) => v.status === 'APROVADO');
  const pendentes = (vinculos || []).filter((v) => v.status === 'PENDENTE');

  return (
    <>
      <h1>Quem tem acesso</h1>
      <p className="subtitulo">Só quem você aprovou vê os dados dos seus filhos.</p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}

      {pendentes.length > 0 && (
        <Link className="cartao destaque" to="/familia/solicitacoes">
          {pendentes.length === 1 ? '1 pedido espera' : `${pendentes.length} pedidos esperam`} a sua resposta
        </Link>
      )}

      {vinculos && aprovados.length === 0 && <p className="vazio">Nenhum profissional tem acesso agora.</p>}
      {aprovados.map((v) => (
        <div key={v.id} className="cartao">
          <strong>{v.profissional_nome}</strong>
          <p className="detalhe">{[nomeEspecialidade(v), v.clinica_nome].filter(Boolean).join(' · ')} · acompanha {v.crianca_nome}</p>
          <label className="marcar">
            <input type="checkbox" checked={Boolean(v.ver_historico_anterior)}
              onChange={(e) => mudarEscopo(v, 'ver_historico_anterior', e.target.checked)} />
            Pode ver o histórico de outros profissionais
          </label>
          <label className="marcar">
            <input type="checkbox" checked={Boolean(v.ver_horarios_outras_clinicas)}
              onChange={(e) => mudarEscopo(v, 'ver_horarios_outras_clinicas', e.target.checked)} />
            Avisar conflito com outra clínica
          </label>
          {confirmando === v.id ? (
            <>
              <p className="nota">Retirar o acesso de {v.profissional_nome}? Vale na mesma hora.</p>
              <button className="botao perigo" onClick={() => revogar(v)}>Sim, retirar</button>
              <button className="botao-sec" onClick={() => setConfirmando(null)}>Cancelar</button>
            </>
          ) : (
            <button className="botao-sec" onClick={() => setConfirmando(v.id)}>Revogar</button>
          )}
        </div>
      ))}

      <Link className="botao-sec bloco" to="/familia/convidar">Convidar outra clínica</Link>
    </>
  );
}
