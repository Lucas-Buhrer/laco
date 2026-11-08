import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/api.js';
import LinhaDoTempo from '../../components/LinhaDoTempo.jsx';
import AtividadesClinica from '../../components/AtividadesClinica.jsx';

function idade(nascimento) {
  const n = new Date(nascimento);
  const hoje = new Date();
  let anos = hoje.getFullYear() - n.getFullYear();
  if (hoje < new Date(hoje.getFullYear(), n.getMonth(), n.getDate())) anos -= 1;
  return anos === 1 ? '1 ano' : `${anos} anos`;
}

// Desenho: docs/telas/D3. Cada abertura desta página fica registrada para a família (regra central de acesso).
export default function PerfilCrianca() {
  const { id } = useParams();
  const [crianca, setCrianca] = useState(null);
  const [itens, setItens] = useState(null);
  const [erro, setErro] = useState('');
  const [adendo, setAdendo] = useState(null); // { registroId, texto }
  const [aviso, setAviso] = useState('');
  const [aba, setAba] = useState('LINHA');

  function carregar() {
    Promise.all([api.get(`/criancas/${id}`), api.get(`/criancas/${id}/linha-do-tempo`)])
      .then(([c, lt]) => { setCrianca(c); setItens(lt); })
      .catch((e) => setErro(e.message));
  }
  useEffect(carregar, [id]);

  async function enviarAdendo(e) {
    e.preventDefault();
    setErro('');
    try {
      await api.post(`/registros/${adendo.registroId}/adendos`, { texto: adendo.texto });
      setAdendo(null);
      setAviso('Adendo salvo. O registro original continua como estava.');
      carregar();
    } catch (e2) {
      setErro(e2.message);
    }
  }

  if (!crianca) return erro ? <p className="aviso-erro" role="alert">{erro}</p> : <p className="carregando">Carregando…</p>;

  return (
    <>
      <Link to="/clinica/criancas" className="voltar">Crianças</Link>
      <div className="cabeca-perfil">
        <span className="inicial">{crianca.nome[0]}</span>
        <div>
          <h1>{crianca.nome}</h1>
          <p className="subtitulo">{idade(crianca.data_nascimento)} · acesso aprovado pela família</p>
        </div>
      </div>
      <div className="acoes-topo">
        <Link className="botao" to={`/clinica/criancas/${id}/registro`}>Registrar sessão</Link>
        <Link className="botao-sec" to={`/clinica/criancas/${id}/parecer`}>Escrever parecer</Link>
      </div>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}
      {aviso && <p className="aviso-info" role="status">{aviso}</p>}

      <div className="pagina-duas">
        <section>
          <div className="abas abas-perfil" role="tablist">
            <button role="tab" aria-selected={aba === 'LINHA'} className={aba === 'LINHA' ? 'aba ativa' : 'aba'} onClick={() => setAba('LINHA')}>Linha do tempo</button>
            <button role="tab" aria-selected={aba === 'ATIVIDADES'} className={aba === 'ATIVIDADES' ? 'aba ativa' : 'aba'} onClick={() => setAba('ATIVIDADES')}>Atividades de casa</button>
          </div>

          {aba === 'LINHA' && (
            <>
              {itens && itens.length === 0 && (
                <div className="vazio-grande">
                  <h2>Nada para mostrar ainda</h2>
                  <p>Registre a primeira sessão ou crie uma atividade de casa. O que aparece aqui depende do que a família liberou.</p>
                </div>
              )}
              {itens && itens.length > 0 && (
                <LinhaDoTempo itens={itens} aoAdendo={(registroId) => setAdendo({ registroId, texto: '' })} />
              )}
            </>
          )}
          {aba === 'ATIVIDADES' && <AtividadesClinica criancaId={id} />}
        </section>

        <div>
          <div className="caixa">
            <h2>Seu acesso</h2>
            {crianca.escopo && (
              <dl className="lista-acesso">
                <div><dt>Suas sessões e atividades</dt><dd><i className="pill ok">Sim</i></dd></div>
                <div><dt>Histórico de outros profissionais</dt><dd><i className={crianca.escopo.ver_historico_anterior ? 'pill ok' : 'pill mu'}>{crianca.escopo.ver_historico_anterior ? 'Liberado' : 'Não liberado'}</i></dd></div>
                <div><dt>Aviso de conflito de horário</dt><dd><i className={crianca.escopo.ver_horarios_outras_clinicas ? 'pill ok' : 'pill mu'}>{crianca.escopo.ver_horarios_outras_clinicas ? 'Sim' : 'Não'}</i></dd></div>
                <div><dt>Acesso desde</dt><dd>{new Date(crianca.escopo.aprovado_em).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</dd></div>
              </dl>
            )}
            <p className="nota">A família pode retirar seu acesso a qualquer momento. Cada abertura desta página fica registrada.</p>
          </div>
        </div>
      </div>
      {adendo && (
        <div className="modal-fundo" onClick={() => setAdendo(null)} onKeyDown={(e) => e.key === 'Escape' && setAdendo(null)}>
          <form className="modal" role="dialog" aria-modal="true" aria-labelledby="titulo-adendo" onClick={(e) => e.stopPropagation()} onSubmit={enviarAdendo}>
            <h2 id="titulo-adendo">Adendo ao registro</h2>
            <p className="nota">O registro original não muda. O adendo aparece logo abaixo dele, com a data.</p>
            <label className="campo">Texto do adendo
              <textarea rows={5} autoFocus value={adendo.texto} onChange={(e) => setAdendo({ ...adendo, texto: e.target.value })} required />
            </label>
            <div className="modal-acoes">
              <button type="button" className="botao-sec" onClick={() => setAdendo(null)}>Cancelar</button>
              <button className="botao">Salvar adendo</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
