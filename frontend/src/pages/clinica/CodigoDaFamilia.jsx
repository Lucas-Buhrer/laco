import { useEffect, useState } from 'react';
import { api } from '../../api/api.js';

const STATUS = {
  PENDENTE: ['Aguardando a família', 'pill wa'],
  APROVADO: ['Aprovado', 'pill ok'],
  RECUSADO: ['Recusado', 'pill mu'],
  REVOGADO: ['Acesso encerrado', 'pill mu'],
  ENCERRADO: ['Encerrado', 'pill mu'],
  EXPIRADO: ['Expirado', 'pill mu'],
};
const ORDEM = { PENDENTE: 0, APROVADO: 1 }; // pendentes primeiro, depois aprovados, depois o resto
const PASSOS = ['Os pais geram o código no app', 'Entregam a você', 'Você digita aqui', 'Eles aprovam o seu acesso'];
const dataBR = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });

// Desenho: docs/telas/D12. Antes da aprovação não se vê nada da criança (nem o nome).
export default function CodigoDaFamilia() {
  const [codigo, setCodigo] = useState('');
  const [pedidos, setPedidos] = useState(null);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  function carregar() {
    api.get('/vinculos').then(setPedidos).catch((e) => setErro(e.message));
  }
  useEffect(carregar, []);

  async function pedir(e) {
    e.preventDefault();
    setErro('');
    setOk(false);
    setEnviando(true);
    try {
      await api.post('/vinculos/solicitar', { codigo });
      setCodigo('');
      setOk(true);
      carregar();
    } catch (e2) {
      setErro(e2.message);
    } finally {
      setEnviando(false);
    }
  }

  const ordenados = [...(pedidos || [])].sort((a, b) => (ORDEM[a.status] ?? 2) - (ORDEM[b.status] ?? 2) || (a.solicitado_em < b.solicitado_em ? 1 : -1));

  return (
    <>
      <h1>Código da família</h1>
      <p className="subtitulo">Os pais geram um código no app e entregam a você. Digite aqui para pedir acesso à criança.</p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {ok && <p className="aviso-info" role="status">Pedido enviado. Agora a família decide.</p>}

      <ol className="passos">
        {PASSOS.map((p, i) => <li key={p}><b>{i + 1}</b>{p}</li>)}
      </ol>

      <div className="pagina-duas" style={{ gridTemplateColumns: 'minmax(320px, 1fr) minmax(0, 1.3fr)' }}>
        <form className="caixa" onSubmit={pedir}>
          <h2>Recebi um código da família</h2>
          <label className="campo">Código recebido dos pais
            <input value={codigo} onChange={(e) => setCodigo(e.target.value)} required autoComplete="off" placeholder="CLIN-XXXX-XXXX" />
          </label>
          <button className="botao botao-grande" disabled={enviando}>{enviando ? 'Enviando…' : 'Pedir acesso'}</button>
          <p className="nota">O código vale por 7 dias e só pode ser usado uma vez. Depois do pedido, a família decide.</p>
        </form>

        <div className="caixa">
          <h2>Meus pedidos</h2>
          {pedidos && pedidos.length === 0 && <p className="vazio">Você ainda não fez pedidos. Quando fizer, eles aparecem aqui.</p>}
          {ordenados.map((p) => {
            const [texto, classe] = STATUS[p.status] || [p.status, 'pill mu'];
            return (
              <div key={p.id} className="linha-pre">
                <span className="avatar-mini">{(p.crianca_nome || '?')[0]}</span>
                <div className="texto-linha">
                  <strong>{p.crianca_nome || 'Criança (nome só após a aprovação)'}</strong>
                  <small>{p.status === 'APROVADO' && p.aprovado_em ? `Aprovado em ${dataBR(p.aprovado_em)}` : `Pedido em ${dataBR(p.solicitado_em)}`}</small>
                </div>
                <span className={classe}>{texto}</span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
