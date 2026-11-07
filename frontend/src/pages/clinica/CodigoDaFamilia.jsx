import { useEffect, useState } from 'react';
import { api } from '../../api/api.js';

const STATUS = { PENDENTE: 'Aguardando a família', APROVADO: 'Aprovado', RECUSADO: 'Recusado', REVOGADO: 'Acesso encerrado', ENCERRADO: 'Encerrado' };

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

  return (
    <>
      <h1>Código da família</h1>
      <p className="subtitulo">Os pais geram um código no app e entregam a você. Digite aqui para pedir acesso à criança.</p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {ok && <p className="aviso-info" role="status">Pedido enviado. Agora a família decide.</p>}

      <form className="caixa estreita" onSubmit={pedir}>
        <label className="campo">Código recebido dos pais
          <input value={codigo} onChange={(e) => setCodigo(e.target.value)} required autoComplete="off" />
        </label>
        <button className="botao" disabled={enviando}>Pedir acesso</button>
        <p className="nota">O código vale por 7 dias e só pode ser usado uma vez. Depois do pedido, a família decide.</p>
      </form>

      <h2 className="titulo-lista">Meus pedidos</h2>
      {pedidos && pedidos.length === 0 && <p className="vazio">Você ainda não fez pedidos.</p>}
      {pedidos && pedidos.map((p) => (
        <div key={p.id} className="linha-lista">
          <div>
            <strong>{p.crianca_nome || 'Criança (nome só após a aprovação)'}</strong>
            <p className="detalhe">{STATUS[p.status] || p.status}</p>
          </div>
        </div>
      ))}
    </>
  );
}
