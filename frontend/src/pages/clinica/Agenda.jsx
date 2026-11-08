import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import GradeHoraria from '../../components/GradeHoraria.jsx';
import LegendaAgenda from '../../components/LegendaAgenda.jsx';
import {
  classeCor, diaDoMes, diaMini, frase, hojeISO, hora, mesAno, nomeDiaCurto, segundaDaSemana, somarDias, somarMeses,
} from '../../utils/consultas.js';
import { nomeEspecialidade } from '../../utils/especialidades.js';

// "Quarta, 11 de novembro", como no desenho D15
const diaPorExtenso = (iso) => {
  const d = new Date(`${iso}T12:00:00`);
  const semana = d.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0];
  return `${semana.charAt(0).toUpperCase()}${semana.slice(1)}, ${d.getDate()} de ${d.toLocaleDateString('pt-BR', { month: 'long' })}`;
};
const dataExtenso = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
const semanaExtensa = (de, ate) => {
  const a = new Date(`${de}T12:00:00`);
  const b = new Date(`${ate}T12:00:00`);
  const mes = (d) => d.toLocaleDateString('pt-BR', { month: 'long' });
  return a.getMonth() === b.getMonth() ? `${a.getDate()} a ${b.getDate()} de ${mes(b)}` : `${a.getDate()} de ${mes(a)} a ${b.getDate()} de ${mes(b)}`;
};

// Desenhos: D4 (profissional: semana em grade), D15 (recepção: um dia, uma coluna por profissional)
// e D18 (administração: tabela da clínica, sem dado clínico).
export default function Agenda() {
  const { usuario } = useAuth();
  const papel = usuario.papel;
  const [dia, setDia] = useState(hojeISO());
  const [lista, setLista] = useState(null);
  const [profissionais, setProfissionais] = useState([]);
  const [crianca, setCrianca] = useState(''); // filtro "Todas as crianças" (profissional)
  const [prof, setProf] = useState(''); // filtro "Todos os profissionais" (administração)
  const [erro, setErro] = useState('');

  const segunda = segundaDaSemana(dia);
  const sabado = somarDias(segunda, 5);
  // Administração vê duas semanas (a anterior e a atual); os outros, a semana
  const de = papel === 'ADMIN_CLINICA' ? somarDias(segunda, -7) : segunda;
  // O profissional lê só as próprias consultas; ADM e Recepção, a agenda da clínica toda
  const rota = papel === 'PROFISSIONAL' ? '/consultas' : '/clinica/agenda';
  const hoje = hojeISO();

  useEffect(() => {
    setLista(null);
    setErro('');
    api.get(`${rota}?de=${de}&ate=${sabado}`).then(setLista).catch((e) => setErro(e.message));
  }, [de, sabado, rota]);
  useEffect(() => {
    if (papel === 'RECEPCAO') api.get('/clinica/profissionais').then(setProfissionais).catch(() => {});
  }, [papel]);

  const dias = Array.from({ length: 6 }, (_, i) => somarDias(segunda, i));
  const porDia = (iso) => (lista || []).filter((c) => c.inicio.slice(0, 10) === iso);
  const botaoNova = papel !== 'ADMIN_CLINICA' && <Link className="botao" to="/clinica/agenda/nova">Nova consulta</Link>;

  // ---------- Barra de mês: igual nos desenhos D4 e D15 ----------
  const barraMes = (
    <div className="barra-mes">
      <button className="icone" aria-label="Mês anterior" onClick={() => setDia(somarMeses(dia, -1))}>‹</button>
      {papel === 'RECEPCAO' && <span className="rotulo">Dia {diaDoMes(dia)}</span>}
      <span className="rotulo largo">{mesAno(dia)}</span>
      <button className="icone" aria-label="Próximo mês" onClick={() => setDia(somarMeses(dia, 1))}>›</button>
      <button className="rotulo" onClick={() => setDia(hoje)}>Hoje</button>
    </div>
  );

  // ================= Administração: tabela (D18) =================
  if (papel === 'ADMIN_CLINICA') {
    const filtradasAdm = (lista || []).filter((c) => !prof || String(c.profissional_id) === prof);
    const diasAdm = [...new Set(filtradasAdm.map((c) => c.inicio.slice(0, 10)))];
    return (
      <>
        <div className="topo-agenda">
          <div>
            <h1>Agenda da clínica</h1>
            <p className="subtitulo">De {dataExtenso(de)} a {dataExtenso(sabado)} · sem dados clínicos</p>
          </div>
          <div className="acoes-topo sem-margem">
            <button className="botao-sec" onClick={() => setDia(somarDias(dia, -14))}>‹ Duas semanas antes</button>
            <button className="botao-sec" onClick={() => setDia(hoje)}>Hoje</button>
            <button className="botao-sec" onClick={() => setDia(somarDias(dia, 14))}>Duas semanas depois ›</button>
          </div>
        </div>
        {erro && <p className="aviso-erro" role="alert">{erro}</p>}
        {!lista && !erro && <p className="carregando">Carregando…</p>}
        {lista && lista.length > 0 && (
          <select className="filtro-criancas filtro-prof" aria-label="Filtrar por profissional" value={prof} onChange={(e) => setProf(e.target.value)}>
            <option value="">Todos os profissionais</option>
            {[...new Map(lista.map((c) => [String(c.profissional_id), c.profissional_nome])).entries()].map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
          </select>
        )}
        {lista && filtradasAdm.length === 0 && <p className="vazio">Nenhuma consulta neste período.</p>}
        {/* Uma tabela por dia, com o dia no título: mais fácil de achar do que uma lista corrida */}
        {diasAdm.map((d) => (
          <section key={d} className="cartao tabela-agenda">
            <h2 className={`titulo-dia ${d === hoje ? 'hoje' : ''}`}>{diaPorExtenso(d)}{d === hoje && ' · hoje'} <small>{filtradasAdm.filter((c) => c.inicio.slice(0, 10) === d).length} consultas</small></h2>
            {filtradasAdm.filter((c) => c.inicio.slice(0, 10) === d).map((c) => (
              <Link key={c.id} to={`/clinica/agenda/${c.id}`} className="linha-tab">
                <span>{hora(c.inicio)}</span>
                <span className="forte">{c.crianca_nome}</span>
                <span className="suave">{c.profissional_nome}</span>
                <span className="suave">{c.tipo || nomeEspecialidade(c)}</span>
                <span className={`pilula ${classeCor(c)}`}>{frase(c)}</span>
              </Link>
            ))}
          </section>
        ))}
      </>
    );
  }

  // ================= Recepção: um dia, uma coluna por profissional (D15) =================
  if (papel === 'RECEPCAO') {
    const doDia = porDia(dia);
    const colunas = profissionais.map((p) => ({ id: p.id, titulo: p.nome, subtitulo: nomeEspecialidade(p) }));
    // Consulta de quem já saiu da clínica continua aparecendo, em coluna própria
    doDia.filter((c) => !colunas.some((x) => x.id === c.profissional_id)).forEach((c) => {
      if (!colunas.some((x) => x.id === c.profissional_id)) colunas.push({ id: c.profissional_id, titulo: c.profissional_nome, subtitulo: nomeEspecialidade(c) });
    });
    const eventos = {};
    doDia.forEach((c) => { (eventos[c.profissional_id] = eventos[c.profissional_id] || []).push(c); });

    return (
      <>
        <div className="topo-agenda">
          <div>
            <p className="etiqueta-topo">{diaPorExtenso(dia)}{dia === hoje && ' (hoje)'} · uma coluna por profissional, atendimentos ao mesmo tempo</p>
            <h1>Agenda</h1>
          </div>
          <div className="acoes-topo sem-margem">{botaoNova}</div>
        </div>
        {erro && <p className="aviso-erro" role="alert">{erro}</p>}
        <div className="linha-ferramentas">{barraMes}<LegendaAgenda /></div>

        <div className="dias-semana">
          <span className="rotulo-semana">Esta semana</span>
          {dias.map((d) => {
            const urgente = porDia(d).some((c) => c.cor === 'VERMELHA');
            return (
              <button key={d} className={`dia-chip ${d === dia ? 'escolhido' : ''} ${d === hoje ? 'hoje' : ''}`} onClick={() => setDia(d)} aria-pressed={d === dia}>
                <small>{d === hoje ? 'Hoje · ' : ''}{nomeDiaCurto(d)}</small>
                {diaDoMes(d)}
                <i className={urgente ? 'ponto' : 'ponto vazio'} aria-label={urgente ? 'Tem consulta para ligar' : undefined} />
              </button>
            );
          })}
        </div>

        {!lista && !erro && <p className="carregando">Carregando…</p>}
        {lista && doDia.length > 0 && (
          <div className="grade-rolagem"><GradeHoraria colunas={colunas} eventos={eventos} /></div>
        )}
        {lista && doDia.length === 0 && (
          <div className="vazio-grande">
            <h2>Nenhuma consulta neste dia</h2>
            <p>Escolha outro dia acima ou marque uma nova consulta.</p>
          </div>
        )}
      </>
    );
  }

  // ================= Profissional: semana em grade (D4) =================
  const filtradas = (lista || []).filter((c) => !crianca || c.crianca_id === crianca);
  const criancas = [...new Map((lista || []).map((c) => [c.crianca_id, c.crianca_nome])).entries()];
  const colunas = dias.map((d) => ({ id: d, titulo: `${nomeDiaCurto(d)[0].toUpperCase()}${nomeDiaCurto(d).slice(1)} ${diaDoMes(d)}`, hoje: d === hoje }));
  const eventos = {};
  filtradas.forEach((c) => { (eventos[c.inicio.slice(0, 10)] = eventos[c.inicio.slice(0, 10)] || []).push(c); });

  return (
    <>
      <div className="topo-agenda">
        <div>
          <p className="etiqueta-topo">Semana de {semanaExtensa(segunda, sabado)} · só consultas da {usuario.clinica?.nome}</p>
          <h1>Agenda</h1>
        </div>
        <div className="acoes-topo sem-margem">{botaoNova}</div>
      </div>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      <div className="linha-ferramentas">
        {barraMes}
        <select className="filtro-criancas" aria-label="Filtrar por criança" value={crianca} onChange={(e) => setCrianca(e.target.value)}>
          <option value="">Todas as crianças</option>
          {criancas.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
        </select>
        <LegendaAgenda />
      </div>

      {!lista && !erro && <p className="carregando">Carregando…</p>}
      {lista && (
        <div className="grade-com-setas">
          <button className="seta seta-esq" aria-label="Ver os dias anteriores" onClick={() => setDia(somarDias(dia, -7))}>
            ‹<small>{diaDoMes(somarDias(segunda, -7))}</small>
          </button>
          <div className="grade-rolagem"><GradeHoraria colunas={colunas} eventos={eventos} /></div>
          <button className="seta seta-dir" aria-label="Ver os próximos dias" onClick={() => setDia(somarDias(dia, 7))}>
            ›<small>{diaDoMes(somarDias(segunda, 7))}</small>
          </button>
        </div>
      )}
      {lista && filtradas.length === 0 && <p className="vazio">Nenhuma consulta nesta semana.</p>}
    </>
  );
}
