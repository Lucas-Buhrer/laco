import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api.js';
import LinhaDoTempo from '../../components/LinhaDoTempo.jsx';

// A família lê todos os registros de sessão e as observações que o profissional marcou como visíveis (RF-54)
export default function LinhaDoTempoFamilia() {
  const [filhos, setFilhos] = useState(null);
  const [filhoId, setFilhoId] = useState('');
  const [itens, setItens] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get('/criancas').then((c) => { setFilhos(c); if (c[0]) setFilhoId(c[0].id); }).catch((e) => setErro(e.message));
  }, []);
  useEffect(() => {
    if (!filhoId) return;
    setItens(null);
    api.get(`/criancas/${filhoId}/linha-do-tempo`).then(setItens).catch((e) => setErro(e.message));
  }, [filhoId]);

  return (
    <>
      <Link to="/familia/mais" className="voltar">Mais</Link>
      <h1>Linha do tempo</h1>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {filhos && filhos.length > 1 && (
        <label className="campo">Filho
          <select value={filhoId} onChange={(e) => setFilhoId(e.target.value)}>
            {filhos.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </label>
      )}
      {itens && itens.length === 0 && <p className="vazio">Ainda não há registros.</p>}
      {itens && <LinhaDoTempo itens={itens} />}
    </>
  );
}
