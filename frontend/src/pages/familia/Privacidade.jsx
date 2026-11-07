import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api.js';

const NOME_PEDIDO = { EXPORTACAO: 'Download dos dados', EXCLUSAO: 'Pedido de exclusão', REVOGACAO: 'Consentimento revogado' };

// Desenho: docs/telas/M16. Baixar os dados, revogar o consentimento e pedir exclusão (com confirmação).
export default function Privacidade() {
  const [filhos, setFilhos] = useState(null);
  const [filhoId, setFilhoId] = useState('');
  const [pedidos, setPedidos] = useState([]);
  const [confirmando, setConfirmando] = useState(null); // 'REVOGACAO' | 'EXCLUSAO'
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  function carregar() {
    api.get('/lgpd/solicitacoes').then(setPedidos).catch((e) => setErro(e.message));
  }
  useEffect(() => {
    api.get('/criancas').then((c) => { setFilhos(c); if (c[0]) setFilhoId(c[0].id); }).catch((e) => setErro(e.message));
    carregar();
  }, []);

  const filho = filhos?.find((f) => f.id === filhoId);

  async function baixar() {
    setErro('');
    setAviso('');
    try {
      const dados = await api.get(`/criancas/${filhoId}/exportar`);
      const arquivo = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(arquivo);
      link.download = `dados-${filho.nome.toLowerCase()}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      setAviso('Pronto. O arquivo foi baixado.');
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  async function pedir() {
    setErro('');
    try {
      const r = await api.post('/lgpd/solicitacoes', { tipo: confirmando, crianca_id: filhoId, confirmar: true });
      setAviso(confirmando === 'REVOGACAO'
        ? `Consentimento revogado e todos os acessos encerrados. Protocolo ${r.protocolo}.`
        : `Pedido de exclusão registrado. Protocolo ${r.protocolo}.`);
      setConfirmando(null);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <>
      <Link to="/familia/mais" className="voltar">Voltar</Link>
      <h1>Privacidade e dados</h1>
      <p className="subtitulo">Você decide o que acontece com os dados {filho ? `de ${filho.nome}` : 'do seu filho'}.</p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {aviso && <p className="aviso-info" role="status">{aviso}</p>}

      {filhos && filhos.length > 1 && (
        <label className="campo" style={{ marginTop: 16 }}>Filho
          <select value={filhoId} onChange={(e) => { setFilhoId(e.target.value); setConfirmando(null); }}>
            {filhos.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </label>
      )}

      <div className="cartao">
        <strong>Baixar meus dados</strong>
        <p className="detalhe">Um arquivo com tudo que o LAÇO guarda. Anotações internas dos profissionais não fazem parte.</p>
        <button className="botao" onClick={baixar} disabled={!filhoId}>Baixar</button>
      </div>

      <div className="cartao">
        <strong>Revogar consentimento</strong>
        <p className="detalhe">Todos os acessos são encerrados na hora.</p>
        <button className="botao-sec" onClick={() => setConfirmando('REVOGACAO')} disabled={!filhoId}>Revogar</button>
      </div>

      <div className="cartao">
        <strong>Pedir exclusão dos dados</strong>
        <p className="detalhe">Pede confirmação antes. O pedido recebe um número de protocolo.</p>
        <button className="botao-sec" onClick={() => setConfirmando('EXCLUSAO')} disabled={!filhoId}>Pedir exclusão</button>
      </div>

      {confirmando && (
        <div className="cartao aviso-conflito" role="alertdialog">
          <strong>{confirmando === 'REVOGACAO' ? 'Revogar o consentimento?' : 'Pedir a exclusão dos dados?'}</strong>
          <p className="detalhe">
            {confirmando === 'REVOGACAO'
              ? `Nenhum profissional verá mais os dados de ${filho?.nome}. Para voltar, será preciso aprovar cada um de novo.`
              : `Registramos o pedido de exclusão dos dados de ${filho?.nome}. Isto não pode ser desfeito depois.`}
          </p>
          <button className="botao perigo" onClick={pedir}>Sim, confirmar</button>
          <button className="botao-sec" onClick={() => setConfirmando(null)}>Voltar</button>
        </div>
      )}

      {pedidos.length > 0 && (
        <>
          <h2 className="titulo-lista">Seus pedidos</h2>
          {pedidos.map((p) => (
            <div key={p.id} className="cartao">
              <strong>{NOME_PEDIDO[p.tipo]} · {p.crianca_nome}</strong>
              <p className="detalhe">Protocolo {p.protocolo} · {p.status === 'CONCLUIDA' ? 'Concluído' : 'Registrado'}</p>
            </div>
          ))}
        </>
      )}
      <p className="nota" style={{ marginTop: 16 }}><Link to="/politica">Ler a Política de privacidade</Link></p>
    </>
  );
}
