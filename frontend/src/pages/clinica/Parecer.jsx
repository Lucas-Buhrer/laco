import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/api.js';
import { dataISO, somarDias } from '../../utils/consultas.js';

const LIMITE = 6000;
const dataBR = (iso) => iso.split('-').reverse().join('/');

// Desenho: docs/telas/D11. O parecer é publicado direto para a família e não pode ser editado depois.
export default function Parecer() {
  const { id } = useParams();
  const navegar = useNavigate();
  const hoje = dataISO(new Date());
  const [crianca, setCrianca] = useState(null);
  const [anteriores, setAnteriores] = useState([]);
  const [f, setF] = useState({ periodo_inicio: somarDias(hoje, -90), periodo_fim: hoje, texto: '' });
  const [resumo, setResumo] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get(`/criancas/${id}`).then(setCrianca).catch((e) => setErro(e.message));
    api.get(`/criancas/${id}/pareceres`).then(setAnteriores).catch(() => {});
  }, [id]);

  // Sem "histórico anterior" liberado pela família, o período só pode começar na data da aprovação
  const corte = crianca?.escopo && !crianca.escopo.ver_historico_anterior ? crianca.escopo.aprovado_em.slice(0, 10) : null;

  // Quando o escopo chega, a data inicial nunca fica antes do corte
  useEffect(() => {
    if (corte) setF((x) => (x.periodo_inicio < corte ? { ...x, periodo_inicio: corte } : x));
  }, [corte]);

  // Resumo do período: só o que é do próprio atendimento
  useEffect(() => {
    if (!crianca || f.periodo_inicio > f.periodo_fim) return undefined;
    const espera = setTimeout(() => {
      api.get(`/criancas/${id}/resumo-periodo?inicio=${f.periodo_inicio}&fim=${f.periodo_fim}`).then(setResumo).catch(() => setResumo(null));
    }, 300);
    return () => clearTimeout(espera);
  }, [id, crianca, f.periodo_inicio, f.periodo_fim]);

  const atalhos = [
    ['Último mês', somarDias(hoje, -30)],
    ['Últimos 3 meses', somarDias(hoje, -90)],
    ...(corte ? [['Desde a aprovação', corte]] : []),
  ].map(([nome, inicio]) => [nome, corte && inicio < corte ? corte : inicio]);

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

  function crescer(e) {
    setF({ ...f, texto: e.target.value });
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.max(280, e.target.scrollHeight)}px`;
  }

  if (!crianca) return erro ? <p className="aviso-erro" role="alert">{erro}</p> : <p className="carregando">Carregando…</p>;

  return (
    <>
      <Link to={`/clinica/criancas/${id}`} className="voltar">Voltar</Link>
      <h1>Parecer do período</h1>
      <p className="subtitulo">{crianca.nome}</p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}

      <form className="registro-form" onSubmit={(e) => { e.preventDefault(); setConfirmando(true); }}>
        <div className="caixa">
          <div className="grupo-campo">
            <span className="titulo-grupo-campo">Período</span>
            <div className="etiquetas-opcao">
              {atalhos.map(([nome, inicio]) => {
                const ativo = f.periodo_inicio === inicio && f.periodo_fim === hoje;
                return (
                  <button key={nome} type="button" className={`chip-opcao ${ativo ? 'on' : ''}`} aria-pressed={ativo} onClick={() => setF({ ...f, periodo_inicio: inicio, periodo_fim: hoje })}>{nome}</button>
                );
              })}
            </div>
          </div>
          <div className="duas-datas">
            <label className="campo">De
              <input type="date" value={f.periodo_inicio} min={corte || undefined} max={f.periodo_fim} onChange={(e) => setF({ ...f, periodo_inicio: e.target.value })} required />
            </label>
            <label className="campo">Até
              <input type="date" value={f.periodo_fim} min={f.periodo_inicio} max={hoje} onChange={(e) => setF({ ...f, periodo_fim: e.target.value })} required />
            </label>
          </div>
          {corte && (
            <p className="nota nota-limite">
              Você só pode escrever sobre o período a partir de <strong>{dataBR(corte)}</strong>, a data em que a família aprovou o seu acesso. O histórico anterior não foi liberado.
            </p>
          )}

          <label className="campo">Texto do parecer
            <textarea className="texto-parecer" value={f.texto} onChange={crescer} required maxLength={LIMITE} />
            <small className="contador-letras">{f.texto.length.toLocaleString('pt-BR')} de {LIMITE.toLocaleString('pt-BR')} letras</small>
          </label>

          <p className="faixa-regra">
            <strong>Depois de publicado, não dá para editar.</strong> Para corrigir, publique um novo parecer. A família passa a ver este texto no relatório de evolução.
          </p>
        </div>

        <div className="registro-dir">
          <div className="caixa">
            <h2 className="titulo-lateral">O que a família já vê neste período</h2>
            {resumo ? (
              <div className="resumo-numeros">
                <div><b>{resumo.consultas_realizadas}</b><span>consultas realizadas</span></div>
                <div><b>{resumo.faltas}</b><span>{resumo.faltas === 1 ? 'falta' : 'faltas'}</span></div>
                <div><b>{resumo.adesao_percentual === null ? '—' : `${resumo.adesao_percentual}%`}</b><span>atividades em casa</span></div>
                <div><b>{resumo.humor_medio === null ? '—' : resumo.humor_medio}</b><span>humor médio (de 1 a 5)</span></div>
              </div>
            ) : <p className="nota">Escolha um período para ver o resumo.</p>}
            <p className="nota">Só o seu atendimento aparece aqui. O relatório é gerado sozinho com registros compartilhados; o seu parecer é um complemento.</p>
          </div>

          {anteriores.length > 0 && (
            <div className="caixa">
              <h2 className="titulo-lateral">Seus pareceres publicados</h2>
              {anteriores.slice(0, 3).map((p) => (
                <div key={p.id} className="parecer-anterior">
                  <small>{dataBR(p.periodo_inicio)} a {dataBR(p.periodo_fim)}</small>
                  <p>{p.texto}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {confirmando && (
          <div className="caixa aviso-conflito confirma-parecer" role="alertdialog">
            <h2>Publicar o parecer?</h2>
            <p>A família verá o texto agora e você não poderá editá-lo.</p>
            <div className="acoes-topo">
              <button type="button" className="botao" onClick={publicar}>Sim, publicar</button>
              <button type="button" className="botao-sec" onClick={() => setConfirmando(false)}>Voltar</button>
            </div>
          </div>
        )}

        <div className="barra-salvar">
          <Link className="botao-sec" to={`/clinica/criancas/${id}`}>Cancelar</Link>
          <button className="botao" disabled={confirmando}>Publicar para a família</button>
        </div>
      </form>
    </>
  );
}
