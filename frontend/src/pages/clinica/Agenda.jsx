import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { classeCor, diaLongo, frase, hojeISO, hora, somarDias } from '../../utils/consultas.js';
import { nomeEspecialidade } from '../../utils/especialidades.js';

// Desenho: docs/telas/D4 (profissional), D15 (recepção, uma coluna por profissional) e D18 (administração).
// Semana = lista por dia. Dia (recepção e administração) = uma coluna por profissional, atendimentos ao mesmo tempo.
export default function Agenda() {
  const { usuario } = useAuth();
  const ehProf = usuario.papel === 'PROFISSIONAL';
  const [visao, setVisao] = useState(ehProf ? 'SEMANA' : 'DIA');
  const [de, setDe] = useState(hojeISO());
  const [lista, setLista] = useState(null);
  const [profissionais, setProfissionais] = useState([]);
  const [erro, setErro] = useState('');
  const dia = visao === 'DIA';
  const ate = dia ? de : somarDias(de, 6);
  const podeAgendar = usuario.papel !== 'ADMIN_CLINICA';
  // O profissional lê só as próprias consultas; ADM e Recepção, a agenda da clínica toda (sem dados clínicos)
  const rota = ehProf ? '/consultas' : '/clinica/agenda';
  const passo = dia ? 1 : 7;

  useEffect(() => {
    setLista(null);
    api.get(`${rota}?de=${de}&ate=${ate}`).then(setLista).catch((e) => setErro(e.message));
  }, [de, ate, rota]);

  useEffect(() => {
    if (!ehProf) api.get('/clinica/profissionais').then(setProfissionais).catch(() => {});
  }, [ehProf]);

  // Agrupa por dia (semana) e por profissional (dia)
  const dias = {};
  (lista || []).forEach((c) => {
    const chave = c.inicio.slice(0, 10);
    (dias[chave] = dias[chave] || []).push(c);
  });
  const colunas = profissionais
    .filter((p) => p.ativo !== 0)
    .map((p) => ({ ...p, consultas: (lista || []).filter((c) => c.profissional_id === p.id) }));
  // Consulta de profissional que já saiu da clínica ainda aparece (a coluna extra evita sumir com ela)
  const idsConhecidos = new Set(colunas.map((c) => c.id));
  (lista || []).filter((c) => !idsConhecidos.has(c.profissional_id)).forEach((c) => {
    let col = colunas.find((x) => x.id === c.profissional_id);
    if (!col) { col = { id: c.profissional_id, nome: c.profissional_nome, especialidade: c.especialidade, especialidade_outro: c.especialidade_outro, consultas: [] }; colunas.push(col); }
    col.consultas.push(c);
  });

  return (
    <>
      <h1>{usuario.papel === 'ADMIN_CLINICA' ? 'Agenda da clínica' : 'Agenda'}</h1>
      <p className="subtitulo">
        {dia ? diaLongo(`${de}T12:00:00`) : `${diaLongo(`${de}T12:00:00`)} a ${diaLongo(`${ate}T12:00:00`)}`} · só consultas da {usuario.clinica?.nome}
        {usuario.papel === 'ADMIN_CLINICA' && ' · sem dados clínicos'}
      </p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}

      <div className="acoes-topo">
        {podeAgendar && <Link className="botao" to="/clinica/agenda/nova">Nova consulta</Link>}
        <button className="botao-sec" onClick={() => setDe(somarDias(de, -passo))}>‹ {dia ? 'Dia anterior' : 'Semana anterior'}</button>
        <button className="botao-sec" onClick={() => setDe(hojeISO())}>Hoje</button>
        <button className="botao-sec" onClick={() => setDe(somarDias(de, passo))}>{dia ? 'Próximo dia' : 'Próxima semana'} ›</button>
        {!ehProf && (
          <button className="botao-sec" onClick={() => setVisao(dia ? 'SEMANA' : 'DIA')}>
            {dia ? 'Ver a semana' : 'Ver por profissional'}
          </button>
        )}
      </div>

      <p className="legenda">
        <span className="chip cor-verde">Confirmada</span>
        <span className="chip cor-azul">Restam 4 dias ou mais</span>
        <span className="chip cor-amarela">Restam 2 ou 3 dias</span>
        <span className="chip cor-vermelha">Falta 1 dia: ligar</span>
      </p>

      {!lista && !erro && <p className="carregando">Carregando…</p>}
      {lista && lista.length === 0 && <p className="vazio">Nenhuma consulta {dia ? 'neste dia' : 'nesta semana'}.</p>}

      {/* Dia: uma coluna por profissional */}
      {dia && lista && colunas.length > 0 && (
        <div className={`colunas-agenda ${de === hojeISO() ? 'dia-hoje' : ''}`}>
          {colunas.map((col) => (
            <div key={col.id} className="coluna-prof">
              <h2>{col.nome}<small>{nomeEspecialidade(col)}</small></h2>
              {col.consultas.length === 0 && <p className="nota">Sem consultas</p>}
              {col.consultas.map((c) => (
                <Link key={c.id} to={`/clinica/agenda/${c.id}`} className={`bloco-consulta ${classeCor(c)}`}>
                  <strong>{hora(c.inicio)}</strong> {c.crianca_nome}
                  <em>{frase(c)}</em>
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Semana: lista por dia, com o dia de hoje em destaque */}
      {!dia && Object.keys(dias).sort().map((d) => (
        <section key={d} className={d === hojeISO() ? 'dia-hoje' : ''}>
          <h2 className={`titulo-dia ${d === hojeISO() ? 'hoje' : ''}`}>
            {diaLongo(`${d}T12:00:00`)}{d === hojeISO() && ' · hoje'}
          </h2>
          {dias[d].map((c) => (
            <Link key={c.id} to={`/clinica/agenda/${c.id}`} className={`linha-consulta ${classeCor(c)}`}>
              <strong>{hora(c.inicio)}</strong>
              <span>
                {c.crianca_nome}
                {!ehProf && <small> · {c.profissional_nome} ({nomeEspecialidade(c)})</small>}
              </span>
              <em>{frase(c)}</em>
            </Link>
          ))}
        </section>
      ))}
    </>
  );
}
