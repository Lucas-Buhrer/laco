import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api.js';

const ESPECIALIDADES = { FONOAUDIOLOGIA: 'Fonoaudiologia', TERAPIA_OCUPACIONAL: 'Terapia ocupacional', PSICOLOGIA: 'Psicologia' };

export function nomeEspecialidade(v) {
  return v.especialidade === 'OUTRA' ? v.especialidade_outro : ESPECIALIDADES[v.especialidade] || v.especialidade || '';
}

// Desenho: docs/telas/M2. Cada pedido vale para UM profissional (RN-18).
function Pedido({ pedido, aoResponder, aoErro }) {
  // Padrões seguros: histórico anterior desligado, aviso de conflito ligado
  const [historico, setHistorico] = useState(false);
  const [horarios, setHorarios] = useState(true);
  const [enviando, setEnviando] = useState(false);

  async function responder(acao) {
    aoErro('');
    setEnviando(true);
    try {
      const corpo = acao === 'aprovar' ? { ver_historico_anterior: historico, ver_horarios_outras_clinicas: horarios } : undefined;
      await api.post(`/vinculos/${pedido.id}/${acao}`, corpo);
      aoResponder();
    } catch (e) {
      aoErro(e.message);
      setEnviando(false);
    }
  }

  return (
    <div className="cartao">
      <p className="etiqueta">Pedido de acesso</p>
      <h2 className="titulo-cartao">{pedido.profissional_nome} quer acompanhar {pedido.crianca_nome}</h2>
      <p className="detalhe">{[nomeEspecialidade(pedido), pedido.clinica_nome].filter(Boolean).join(' · ')}</p>

      <p className="etiqueta">O que poderá ver</p>
      <p className="detalhe">Consultas e atividades feitas por ele(a). Sempre incluído.</p>
      <label className="marcar">
        <input type="checkbox" checked={historico} onChange={(e) => setHistorico(e.target.checked)} />
        Histórico de outros profissionais
      </label>
      <label className="marcar">
        <input type="checkbox" checked={horarios} onChange={(e) => setHorarios(e.target.checked)} />
        Aviso de conflito de horário (só avisa se já houver consulta em outra clínica)
      </label>
      <p className="nota">Você pode retirar o acesso a qualquer momento.</p>

      <button className="botao botao-grande" disabled={enviando} onClick={() => responder('aprovar')}>Aprovar acesso</button>
      <button className="botao-sec bloco" disabled={enviando} onClick={() => responder('recusar')}>Agora não</button>
    </div>
  );
}

export default function Solicitacoes() {
  const [pedidos, setPedidos] = useState(null);
  const [erro, setErro] = useState('');
  const [feito, setFeito] = useState(false);

  function carregar() {
    api.get('/vinculos')
      .then((v) => setPedidos(v.filter((x) => x.status === 'PENDENTE')))
      .catch((e) => setErro(e.message));
  }
  useEffect(carregar, []);

  if (!pedidos && !erro) return <p className="carregando">Carregando…</p>;

  return (
    <>
      <h1>Pedidos de acesso</h1>
      <p className="subtitulo">Ninguém vê os dados do seu filho sem a sua aprovação.</p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {feito && <p className="aviso-info" role="status">Pronto, sua resposta foi registrada.</p>}
      {pedidos && pedidos.length === 0 && <p className="vazio">Nenhum pedido esperando você.</p>}
      {pedidos && pedidos.map((p) => (
        <Pedido key={p.id} pedido={p} aoErro={setErro} aoResponder={() => { setFeito(true); carregar(); }} />
      ))}
      <Link className="botao-sec bloco" to="/familia/acessos">Ver quem tem acesso</Link>
    </>
  );
}
