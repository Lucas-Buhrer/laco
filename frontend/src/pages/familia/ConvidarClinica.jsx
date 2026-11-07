import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api.js';

// Desenho: docs/telas/M12. O código só aparece aqui; o servidor guarda apenas o hash.
export default function ConvidarClinica() {
  const [filhos, setFilhos] = useState(null);
  const [filhoId, setFilhoId] = useState('');
  const [convite, setConvite] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get('/criancas')
      .then((c) => { setFilhos(c); if (c[0]) setFilhoId(String(c[0].id)); })
      .catch((e) => setErro(e.message));
  }, []);

  async function gerar() {
    setErro('');
    setCopiado(false);
    try {
      setConvite(await api.post(`/criancas/${filhoId}/convites`));
    } catch (e) {
      setErro(e.message);
    }
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(convite.codigo);
      setCopiado(true);
    } catch {
      setErro('Não deu para copiar. Anote o código.');
    }
  }

  if (!filhos && !erro) return <p className="carregando">Carregando…</p>;

  return (
    <>
      <Link to="/familia/acessos" className="voltar">Voltar</Link>
      <h1>Convidar outra clínica</h1>
      <p className="subtitulo">Gere um código e entregue ao profissional. Ele pede o acesso e você decide se aprova.</p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}

      {filhos && filhos.length > 1 && (
        <label className="campo" style={{ marginTop: 20 }}>Para qual filho?
          <select value={filhoId} onChange={(e) => { setFilhoId(e.target.value); setConvite(null); }}>
            {filhos.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </label>
      )}

      {convite ? (
        <div className="cartao">
          <p className="etiqueta">Código para {filhos.find((f) => String(f.id) === filhoId)?.nome}</p>
          <p className="codigo-grande">{convite.codigo}</p>
          <p className="nota">Vale 7 dias e só pode ser usado uma vez.</p>
          <button className="botao" onClick={copiar}>{copiado ? 'Copiado!' : 'Copiar'}</button>
          <button className="botao-sec" onClick={gerar}>Gerar novo código</button>
        </div>
      ) : (
        filhoId && <button className="botao botao-grande bloco" onClick={gerar}>Gerar código</button>
      )}
    </>
  );
}
