import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/api.js';
import { dataISO, somarDias, hora, diaMini } from '../../utils/consultas.js';
import Icone from '../../components/Icone.jsx';

const OBJETIVOS = ['Comunicação com figuras', 'Troca de atividade', 'Coordenação fina', 'Autonomia na rotina'];
// Do 1 ao 5, na mesma ordem e com os mesmos nomes da linha do tempo e do relatório
const HUMORES = [[1, 'Muito difícil'], [2, 'Agitado'], [3, 'Tranquilo'], [4, 'Bem'], [5, 'Ótimo']];
const COR_HUMOR = { 1: '#d9826a', 2: '#e8b36b', 3: '#e8d28a', 4: '#9fd3b0', 5: '#4faf7c' };

// Rosto simples: a boca vai de triste (1) a sorriso grande (5)
function Rosto({ nivel }) {
  const bocas = { 1: 'M8 17c1-2 3-3 4-3s3 1 4 3', 2: 'M9 16c1-1 2-1.4 3-1.4s2 .4 3 1.4', 3: 'M9 15.5h6', 4: 'M8.5 14.5c1 1.6 2.2 2.2 3.5 2.2s2.5-.6 3.5-2.2', 5: 'M8 14c1 3 2.4 4 4 4s3-1 4-4z' };
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" />
      <circle cx="9" cy="10" r="0.6" fill="currentColor" /><circle cx="15" cy="10" r="0.6" fill="currentColor" />
      <path d={bocas[nivel]} />
    </svg>
  );
}

// Desenho: docs/telas/D9. Resumo, objetivos e humor sempre aparecem para a família; só a observação pode ficar "Só para mim".
export default function RegistrarSessao() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [crianca, setCrianca] = useState(null);
  const [consultas, setConsultas] = useState([]);
  const [consultaId, setConsultaId] = useState(''); // '' = registro avulso
  const [resumo, setResumo] = useState('');
  const [objetivos, setObjetivos] = useState([]);
  const [humor, setHumor] = useState(3);
  const [observacao, setObservacao] = useState('');
  const [mostrar, setMostrar] = useState(false); // padrão: só para mim
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api.get(`/criancas/${id}`).then(setCrianca).catch((e) => setErro(e.message));
    // Consultas desta criança com você nos últimos 14 dias que já começaram: a mais recente já vem escolhida
    const hoje = dataISO(new Date());
    api.get(`/consultas?crianca_id=${id}&de=${somarDias(hoje, -14)}&ate=${hoje}`)
      .then((lista) => {
        const agora = new Date();
        const candidatas = lista
          .filter((c) => (c.status === 'AGENDADA' || c.status === 'REALIZADA') && new Date(c.inicio) <= agora)
          .sort((a, b) => (a.inicio < b.inicio ? 1 : -1));
        setConsultas(candidatas);
        if (candidatas[0]) setConsultaId(String(candidatas[0].id));
      })
      .catch(() => {}); // sem consulta, o registro continua possível como avulso
  }, [id]);

  const marcar = (o) => setObjetivos(objetivos.includes(o) ? objetivos.filter((x) => x !== o) : [...objetivos, o]);

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await api.post(`/criancas/${id}/registros`, {
        resumo, objetivos: objetivos.join(', '), humor, observacao, observacao_visivel_familia: mostrar,
        consulta_id: consultaId ? Number(consultaId) : undefined,
      });
      // "Encerrar sessão": a consulta agendada que acabou de acontecer passa a Realizada
      const escolhida = consultas.find((c) => String(c.id) === consultaId);
      if (escolhida?.status === 'AGENDADA') await api.post(`/consultas/${escolhida.id}/realizada`, {}).catch(() => {});
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
          <label className="campo">Consulta desta sessão
            <select value={consultaId} onChange={(e) => setConsultaId(e.target.value)}>
              {consultas.map((c) => (
                <option key={c.id} value={c.id}>{diaMini(c.inicio)}, {hora(c.inicio)} · {c.tipo || 'Consulta'}{c.status === 'REALIZADA' ? ' (já realizada)' : ''}</option>
              ))}
              <option value="">Sem consulta (registro avulso)</option>
            </select>
          </label>
          <label className="campo">Resumo da sessão
            <textarea rows={10} value={resumo} onChange={(e) => setResumo(e.target.value)} required />
          </label>
          <label className="campo">Observação do profissional
            <textarea rows={4} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </label>

          <div className="grupo-campo">
            <span className="titulo-grupo-campo">Quem lê a observação</span>
            <div className="seletor-privacidade" role="radiogroup" aria-label="Quem lê a observação">
              <button type="button" role="radio" aria-checked={!mostrar} className={`opcao-priv interna ${!mostrar ? 'on' : ''}`} onClick={() => setMostrar(false)}>
                <Icone nome="cadeado" tamanho={18} />Só para mim
              </button>
              <button type="button" role="radio" aria-checked={mostrar} className={`opcao-priv aberta ${mostrar ? 'on' : ''}`} onClick={() => setMostrar(true)}>
                <Icone nome="olho" tamanho={18} />Mostrar para a família
              </button>
            </div>
            <p className={`nota ${mostrar ? '' : 'destaque-priv'}`}>
              {mostrar
                ? 'A família vai ler esta observação junto com o registro.'
                : 'Ninguém mais lê esta anotação: nem a família, nem outros profissionais, nem a administração.'}
            </p>
          </div>
        </div>

        <div className="registro-dir">
          <div className="caixa">
            <div className="grupo-campo">
              <span className="titulo-grupo-campo">Objetivos trabalhados</span>
              <div className="etiquetas-opcao">
                {OBJETIVOS.map((o) => (
                  <button key={o} type="button" className={`chip-opcao ${objetivos.includes(o) ? 'on' : ''}`} aria-pressed={objetivos.includes(o)} onClick={() => marcar(o)}>
                    {objetivos.includes(o) && <span aria-hidden="true">✓ </span>}{o}
                  </button>
                ))}
              </div>
            </div>

            <div className="grupo-campo">
              <span className="titulo-grupo-campo">Humor</span>
              <div className="humor-opcoes" role="radiogroup" aria-label="Humor">
                {HUMORES.map(([nivel, nome]) => (
                  <button key={nivel} type="button" role="radio" aria-checked={humor === nivel} className={`opcao-humor ${humor === nivel ? 'on' : ''}`}
                    style={humor === nivel ? { borderColor: COR_HUMOR[nivel], background: `${COR_HUMOR[nivel]}33` } : undefined} onClick={() => setHumor(nivel)}>
                    <span style={{ color: humor === nivel ? '#12241c' : COR_HUMOR[nivel] }}><Rosto nivel={nivel} /></span>
                    <small>{nome}</small>
                  </button>
                ))}
              </div>
            </div>
            <p className="nota">Resumo, objetivos e humor aparecem sempre para os responsáveis. Só a observação pode ficar escondida.</p>
          </div>
        </div>

        <div className="barra-salvar">
          <Link className="botao-sec" to={`/clinica/criancas/${id}`}>Cancelar</Link>
          <button className="botao" disabled={enviando}>{enviando ? 'Salvando…' : 'Salvar e encerrar sessão'}</button>
        </div>
      </form>
    </>
  );
}
