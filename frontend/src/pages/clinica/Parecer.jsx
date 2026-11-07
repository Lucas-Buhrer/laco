import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/api.js';
import { dataISO, somarDias } from '../../utils/consultas.js';

// Desenho: docs/telas/D11. O parecer é publicado direto para a família e não pode ser editado depois.
export default function Parecer() {
  const { id } = useParams();
  const navegar = useNavigate();
  const hoje = dataISO(new Date());
  const [crianca, setCrianca] = useState(null);
  const [anteriores, setAnteriores] = useState([]);
  const [f, setF] = useState({ periodo_inicio: somarDias(hoje, -90), periodo_fim: hoje, texto: '' });
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get(`/criancas/${id}`).then(setCrianca).catch((e) => setErro(e.message));
    api.get(`/criancas/${id}/pareceres`).then(setAnteriores).catch(() => {});
  }, [id]);

  async function publicar() {
    setErro('');
    try {
      await api.post(`/criancas/${id}/pareceres`, f);
      navegar(`/clinica/criancas/${id}`);
    } catch (e) {
      setErro(e.message);
      setConfirmando(false);
    }
  }

  if (!crianca) return erro ? <p className="aviso-erro" role="alert">{erro}</p> : <p className="carregando">Carregando…</p>;

  return (
    <>
      <Link to={`/clinica/criancas/${id}`} className="voltar">‹ Voltar</Link>
      <h1>Parecer do período</h1>
      <p className="subtitulo">{crianca.nome}</p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}

      <form className="caixa estreita" onSubmit={(e) => { e.preventDefault(); setConfirmando(true); }}>
        <label className="campo">De<input type="date" value={f.periodo_inicio} onChange={(e) => setF({ ...f, periodo_inicio: e.target.value })} required /></label>
        <label className="campo">Até<input type="date" value={f.periodo_fim} onChange={(e) => setF({ ...f, periodo_fim: e.target.value })} required /></label>
        <label className="campo">Texto do parecer
          <textarea rows={8} value={f.texto} onChange={(e) => setF({ ...f, texto: e.target.value })} required maxLength={6000} />
        </label>
        <p className="nota">Depois de publicado, o parecer não pode ser editado (para corrigir, publique um novo). A família passa a vê-lo no relatório de evolução. O relatório é gerado sozinho só com registros compartilhados; o seu parecer é um complemento.</p>
        <button className="botao">Publicar para a família</button>
      </form>

      {confirmando && (
        <div className="caixa aviso-conflito" role="alertdialog">
          <h2>Publicar o parecer?</h2>
          <p>A família verá o texto agora e você não poderá editá-lo.</p>
          <div className="acoes-topo">
            <button className="botao" onClick={publicar}>Sim, publicar</button>
            <button className="botao-sec" onClick={() => setConfirmando(false)}>Voltar</button>
          </div>
        </div>
      )}

      {anteriores.length > 0 && (
        <>
          <h2 className="titulo-lista">Seus pareceres publicados</h2>
          {anteriores.map((p) => (
            <div key={p.id} className="cartao">
              <p className="etiqueta">{p.periodo_inicio.split('-').reverse().join('/')} a {p.periodo_fim.split('-').reverse().join('/')}</p>
              <p>{p.texto}</p>
            </div>
          ))}
        </>
      )}
    </>
  );
}
