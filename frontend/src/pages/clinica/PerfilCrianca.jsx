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
      <Link to="/clinica/criancas" className="voltar">‹ Crianças</Link>
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
          <h2 className="titulo-lista">Linha do tempo</h2>
          {itens && itens.length === 0 && <p className="vazio">Nada para mostrar ainda. O que aparece aqui depende do que a família liberou.</p>}
          {itens && (
            <LinhaDoTempo
              itens={itens}
              aoAdendo={(registroId) => setAdendo({ registroId, texto: '' })}
            />
          )}
        </section>

        <div>
          {adendo && (
            <form className="caixa" onSubmit={enviarAdendo}>
              <h2>Adendo ao registro</h2>
              <p className="nota">O registro original não muda. O adendo aparece logo abaixo dele, com a data.</p>
              <label className="campo">Texto do adendo
                <textarea rows={4} value={adendo.texto} onChange={(e) => setAdendo({ ...adendo, texto: e.target.value })} required />
              </label>
              <div className="acoes-topo">
                <button className="botao">Salvar adendo</button>
                <button type="button" className="botao-sec" onClick={() => setAdendo(null)}>Cancelar</button>
              </div>
            </form>
          )}

          <AtividadesClinica criancaId={id} />

          <div className="caixa">
            <h2>Seu acesso</h2>
            <p className="nota">A família pode retirar seu acesso a qualquer momento. Cada abertura desta página fica registrada.</p>
          </div>
        </div>
      </div>
    </>
  );
}
