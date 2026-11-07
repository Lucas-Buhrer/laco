import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api.js';
import { dataISO, somarDias } from '../../utils/consultas.js';

const PERIODOS = [['1', 'Último mês', 30], ['3', 'Últimos 3 meses', 90], ['6', 'Últimos 6 meses', 180], ['12', 'Último ano', 365]];
const dataBR = (iso) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
const mesBR = (mes) => new Date(`${mes}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'short' });
const semanaBR = (s) => new Date(`${s}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
const HUMOR = { 1: 'muito difícil', 2: 'agitado', 3: 'tranquilo', 4: 'bem', 5: 'ótimo' };

// Desenho: docs/telas/M3 (tela) e M3b (folha de impressão). Imprimir ou salvar em PDF pelo navegador.
export default function Relatorio() {
  const [filhos, setFilhos] = useState(null);
  const [filhoId, setFilhoId] = useState('');
  const [meses, setMeses] = useState('3');
  const [r, setR] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get('/criancas').then((c) => { setFilhos(c); if (c[0]) setFilhoId(c[0].id); }).catch((e) => setErro(e.message));
  }, []);
  useEffect(() => {
    if (!filhoId) return;
    const dias = PERIODOS.find((p) => p[0] === meses)[2];
    const fim = dataISO(new Date());
    setR(null);
    api.get(`/criancas/${filhoId}/relatorio?inicio=${somarDias(fim, -dias)}&fim=${fim}`).then(setR).catch((e) => setErro(e.message));
  }, [filhoId, meses]);

  return (
    <div className="relatorio">
      <div className="nao-imprimir">
        <Link to="/familia/mais" className="voltar">Mais</Link>
        <h1>Relatório de evolução</h1>
        {erro && <p className="aviso-erro" role="alert">{erro}</p>}
        {filhos && filhos.length > 1 && (
          <label className="campo">Filho
            <select value={filhoId} onChange={(e) => setFilhoId(e.target.value)}>
              {filhos.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </label>
        )}
        <label className="campo">Período
          <select value={meses} onChange={(e) => setMeses(e.target.value)}>
            {PERIODOS.map(([v, nome]) => <option key={v} value={v}>{nome}</option>)}
          </select>
        </label>
        <button className="botao-sec bloco" onClick={() => window.print()} disabled={!r}>Imprimir ou salvar em PDF</button>
      </div>

      {r && (
        <article className="folha">
          <p className="so-impressao">laço · gerado em {dataBR(dataISO(new Date()))}</p>
          <h2 className="titulo-lista">{r.crianca}</h2>
          <p className="subtitulo">{dataBR(r.periodo.inicio)} a {dataBR(r.periodo.fim)} · pedido por {r.pedido_por}. Só registros compartilhados com você.</p>

          <div className="numeros">
            <div className="numero"><strong>{r.consultas_realizadas}</strong>consultas realizadas</div>
            <div className="numero"><strong>{r.faltas}</strong>{r.faltas === 1 ? 'falta' : 'faltas'}</div>
            <div className="numero"><strong>{r.adesao_percentual === null ? '—' : `${r.adesao_percentual}%`}</strong>atividades feitas em casa</div>
            <div className="numero"><strong>{r.humor_medio === null ? '—' : r.humor_medio}</strong>humor médio (de 1 a 5)</div>
          </div>

          {r.adesao_por_mes.some((m) => m.percentual !== null) && (
            <>
              <h3>Adesão por mês</h3>
              <div className="barras" role="img" aria-label="Adesão às atividades por mês">
                {r.adesao_por_mes.map((m) => (
                  <div key={m.mes} className="barra-coluna">
                    <span>{m.percentual === null ? '—' : `${m.percentual}%`}</span>
                    <div className="barra" style={{ height: `${m.percentual || 0}px` }} />
                    <small>{mesBR(m.mes)}</small>
                  </div>
                ))}
              </div>
            </>
          )}

          {r.humor_por_semana.length > 0 && (
            <>
              <h3>Humor ao longo do tempo</h3>
              <ul className="lista-humor">
                {r.humor_por_semana.map((s) => (
                  <li key={s.semana}>
                    <span>semana de {semanaBR(s.semana)}</span>
                    <div className="trilho"><div className="preenchido" style={{ width: `${(s.media / 5) * 100}%` }} /></div>
                    <strong>{s.media} · {HUMOR[Math.round(s.media)]}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}

          {r.objetivos.length > 0 && (
            <>
              <h3>Objetivos trabalhados</h3>
              <ul>{r.objetivos.map((o) => <li key={o}>{o}</li>)}</ul>
            </>
          )}

          {r.pareceres.map((p) => (
            <div key={p.id} className="cartao parecer">
              <p className="etiqueta">Parecer do profissional · publicado em {dataBR(p.publicado_em)} · não pode ser editado</p>
              <p>{p.texto}</p>
              <p className="detalhe">{p.profissional_nome} · {p.clinica_nome}</p>
            </div>
          ))}

          <p className="nota">Este relatório usa somente registros compartilhados com a família. Observações privadas dos profissionais nunca aparecem aqui. Documento com dados pessoais de saúde de uma criança: guarde com cuidado.</p>
        </article>
      )}
    </div>
  );
}
