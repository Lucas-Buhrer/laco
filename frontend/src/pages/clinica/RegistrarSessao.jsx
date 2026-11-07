import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/api.js';

const OBJETIVOS = ['Comunicação com figuras', 'Troca de atividade', 'Coordenação fina', 'Autonomia na rotina'];
const HUMORES = [[3, 'Tranquilo'], [2, 'Agitado'], [1, 'Cansado'], [4, 'Bem'], [5, 'Ótimo']];

// Desenho: docs/telas/D9. Resumo, objetivos e humor sempre aparecem para a família; só a observação pode ficar "Só para mim".
export default function RegistrarSessao() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [crianca, setCrianca] = useState(null);
  const [resumo, setResumo] = useState('');
  const [objetivos, setObjetivos] = useState([]);
  const [humor, setHumor] = useState(3);
  const [observacao, setObservacao] = useState('');
  const [mostrar, setMostrar] = useState(false); // padrão: só para mim
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api.get(`/criancas/${id}`).then(setCrianca).catch((e) => setErro(e.message));
  }, [id]);

  const marcar = (o) => setObjetivos(objetivos.includes(o) ? objetivos.filter((x) => x !== o) : [...objetivos, o]);

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await api.post(`/criancas/${id}/registros`, {
        resumo, objetivos: objetivos.join(', '), humor, observacao, observacao_visivel_familia: mostrar,
      });
      navegar(`/clinica/criancas/${id}`);
    } catch (e2) {
      setErro(e2.message);
    } finally {
      setEnviando(false);
    }
  }

  if (!crianca) return erro ? <p className="aviso-erro" role="alert">{erro}</p> : <p className="carregando">Carregando…</p>;

  return (
    <>
      <Link to={`/clinica/criancas/${id}`} className="voltar">Cancelar</Link>
      <h1>Registro da sessão</h1>
      <p className="subtitulo">{crianca.nome}</p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}

      <form className="registro-form" onSubmit={salvar}>
        <div className="caixa">
          <label className="campo">Resumo da sessão
            <textarea rows={10} value={resumo} onChange={(e) => setResumo(e.target.value)} required />
          </label>
          <label className="campo">Observação do profissional
            <textarea rows={4} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </label>
          <fieldset className="profissionais">
            <legend>Quem lê a observação</legend>
            <div className="grupo-opcoes linha">
              <label className="marcar"><input type="radio" name="obs" checked={!mostrar} onChange={() => setMostrar(false)} />Só para mim</label>
              <label className="marcar"><input type="radio" name="obs" checked={mostrar} onChange={() => setMostrar(true)} />Mostrar para a família</label>
            </div>
            <p className="nota">“Só para mim”: ninguém mais lê esta observação, nem a família, nem outros profissionais, nem a administração.</p>
          </fieldset>
        </div>

        <div className="registro-dir">
          <div className="caixa">
            <fieldset className="profissionais">
              <legend>Objetivos trabalhados</legend>
              <div className="grupo-opcoes">
                {OBJETIVOS.map((o) => (
                  <label key={o} className="marcar"><input type="checkbox" checked={objetivos.includes(o)} onChange={() => marcar(o)} />{o}</label>
                ))}
              </div>
            </fieldset>
            <fieldset className="profissionais">
              <legend>Humor</legend>
              <div className="grupo-opcoes linha">
                {HUMORES.map(([valor, nome]) => (
                  <label key={valor} className="marcar">
                    <input type="radio" name="humor" checked={humor === valor} onChange={() => setHumor(valor)} />{nome}
                  </label>
                ))}
              </div>
            </fieldset>
            <p className="nota">Resumo, objetivos e humor aparecem sempre para os responsáveis. Só a observação pode ficar escondida.</p>
          </div>
          <button className="botao botao-grande" disabled={enviando}>Salvar e encerrar sessão</button>
        </div>
      </form>
    </>
  );
}
