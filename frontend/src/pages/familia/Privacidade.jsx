import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api.js';

const NOME_PEDIDO = { EXPORTACAO: 'Download dos dados', EXCLUSAO: 'Pedido de exclusão', REVOGACAO: 'Consentimento revogado' };

// Desenho: docs/telas/M16. Baixar os dados, revogar o consentimento e excluir o cadastro (apaga na hora, com confirmação).
export default function Privacidade() {
  const [filhos, setFilhos] = useState(null);
  const [filhoId, setFilhoId] = useState('');
  const [pedidos, setPedidos] = useState([]);
  const [confirmando, setConfirmando] = useState(null); // 'REVOGACAO' | 'EXCLUSAO'
  const [nomeDigitado, setNomeDigitado] = useState(''); // excluir pede o nome da criança, para não ser sem querer
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  function carregar() {
    api.get('/lgpd/solicitacoes').then(setPedidos).catch((e) => setErro(e.message));
  }
  function carregarFilhos() {
    api.get('/criancas').then((c) => { setFilhos(c); setFilhoId(c[0]?.id || ''); }).catch((e) => setErro(e.message));
  }
  useEffect(() => {
    carregarFilhos();
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

  function escolher(tipo) {
    setConfirmando(tipo);
    setNomeDigitado('');
    setErro('');
    setAviso('');
  }

  async function pedir() {
    setErro('');
    try {
      if (confirmando === 'REVOGACAO') {
        const r = await api.post('/lgpd/solicitacoes', { tipo: 'REVOGACAO', crianca_id: filhoId, confirmar: true });
        setAviso(`Consentimento revogado e todos os acessos encerrados. Protocolo ${r.protocolo}.`);
      } else {
        const r = await api.post('/lgpd/excluir-crianca', { crianca_id: filhoId, confirmar: true, nome_confirmacao: nomeDigitado });
        setAviso(`O cadastro de ${filho.nome} foi excluído e os dados foram apagados. Protocolo ${r.protocolo}.`);
        carregarFilhos();
      }
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
        <button className="botao-sec" onClick={() => escolher('REVOGACAO')} disabled={!filhoId}>Revogar</button>
      </div>

      <div className="cartao">
        <strong>Excluir cadastro {filho ? `de ${filho.nome}` : ''}</strong>
        <p className="detalhe">Apaga na hora tudo sobre a criança: consultas, sessões, atividades e pareceres. Não dá para desfazer.</p>
        <button className="botao-sec perigo-texto" onClick={() => escolher('EXCLUSAO')} disabled={!filhoId}>Excluir cadastro</button>
      </div>

      {confirmando && (
        <div className="cartao aviso-conflito" role="alertdialog">
          <strong>{confirmando === 'REVOGACAO' ? 'Revogar o consentimento?' : `Excluir o cadastro de ${filho?.nome}?`}</strong>
          {confirmando === 'REVOGACAO' ? (
            <p className="detalhe">Nenhum profissional verá mais os dados de {filho?.nome}. Para voltar, será preciso aprovar cada um de novo.</p>
          ) : (
            <>
              <p className="detalhe">
                Tudo sobre {filho?.nome} será apagado para todos: para você, para o outro responsável e para as clínicas.
                Os profissionais e a clínica serão avisados. <strong>Não dá para desfazer.</strong> Se quiser guardar uma cópia, use "Baixar" antes.
              </p>
              <label className="campo">Para confirmar, digite o nome: {filho?.nome}
                <input value={nomeDigitado} onChange={(e) => setNomeDigitado(e.target.value)} autoComplete="off" />
              </label>
            </>
          )}
          <button className="botao perigo" onClick={pedir}
            disabled={confirmando === 'EXCLUSAO' && nomeDigitado.trim().toLocaleLowerCase('pt-BR') !== (filho?.nome || '').toLocaleLowerCase('pt-BR')}>
            {confirmando === 'REVOGACAO' ? 'Sim, confirmar' : 'Excluir para sempre'}
          </button>
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
