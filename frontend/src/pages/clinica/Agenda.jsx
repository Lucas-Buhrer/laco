import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { classeCor, diaLongo, frase, hojeISO, hora, somarDias } from '../../utils/consultas.js';
import { nomeEspecialidade } from '../../utils/especialidades.js';

// Desenho: docs/telas/D4 (profissional), D15 (recepção), D18 (administração).
// Em vez de grade de horários, uma lista por dia: mais simples e mostra as mesmas informações.
export default function Agenda() {
  const { usuario } = useAuth();
  const [de, setDe] = useState(hojeISO());
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');
  const ate = somarDias(de, 6);
  const podeAgendar = usuario.papel !== 'ADMIN_CLINICA';
  // O profissional lê só as próprias consultas; ADM e Recepção, a agenda da clínica toda (sem dados clínicos)
  const rota = usuario.papel === 'PROFISSIONAL' ? '/consultas' : '/clinica/agenda';

  useEffect(() => {
    setLista(null);
    api.get(`${rota}?de=${de}&ate=${ate}`).then(setLista).catch((e) => setErro(e.message));
  }, [de, ate, rota]);

  // Agrupa por dia
  const dias = {};
  (lista || []).forEach((c) => {
    const chave = c.inicio.slice(0, 10);
    (dias[chave] = dias[chave] || []).push(c);
  });

  return (
    <>
      <h1>{usuario.papel === 'ADMIN_CLINICA' ? 'Agenda da clínica' : 'Agenda'}</h1>
      <p className="subtitulo">
        {diaLongo(`${de}T12:00:00`)} a {diaLongo(`${ate}T12:00:00`)} · só consultas da {usuario.clinica?.nome}
        {usuario.papel === 'ADMIN_CLINICA' && ' · sem dados clínicos'}
      </p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}

      <div className="acoes-topo">
        {podeAgendar && <Link className="botao" to="/clinica/agenda/nova">Nova consulta</Link>}
        <button className="botao-sec" onClick={() => setDe(somarDias(de, -7))}>‹ Semana anterior</button>
        <button className="botao-sec" onClick={() => setDe(hojeISO())}>Hoje</button>
        <button className="botao-sec" onClick={() => setDe(somarDias(de, 7))}>Próxima semana ›</button>
      </div>

      <p className="legenda">
        <span className="chip cor-verde">Confirmada</span>
        <span className="chip cor-azul">4 dias ou mais</span>
        <span className="chip cor-amarela">2 ou 3 dias</span>
        <span className="chip cor-vermelha">Falta 1 dia: ligar</span>
      </p>

      {!lista && !erro && <p className="carregando">Carregando…</p>}
      {lista && lista.length === 0 && <p className="vazio">Nenhuma consulta nesta semana.</p>}
      {Object.keys(dias).sort().map((dia) => (
        <section key={dia}>
          <h2 className={`titulo-dia ${dia === hojeISO() ? 'hoje' : ''}`}>
            {diaLongo(`${dia}T12:00:00`)}{dia === hojeISO() && ' · hoje'}
          </h2>
          {dias[dia].map((c) => (
            <Link key={c.id} to={`/clinica/agenda/${c.id}`} className={`linha-consulta ${classeCor(c)}`}>
              <strong>{hora(c.inicio)}</strong>
              <span>
                {c.crianca_nome}
                {usuario.papel !== 'PROFISSIONAL' && <small> · {c.profissional_nome} ({nomeEspecialidade(c)})</small>}
              </span>
              <em>{frase(c)}</em>
            </Link>
          ))}
        </section>
      ))}
    </>
  );
}
