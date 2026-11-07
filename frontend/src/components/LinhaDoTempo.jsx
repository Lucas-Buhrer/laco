import { useState } from 'react';
import { hora } from '../utils/consultas.js';
import Icone from './Icone.jsx';

const HUMOR = { 1: 'muito difícil', 2: 'agitado', 3: 'tranquilo', 4: 'bem', 5: 'ótimo' };
const COR_HUMOR = { 1: '#d9826a', 2: '#e8b36b', 3: '#e8d28a', 4: '#9fd3b0', 5: '#4faf7c' };
const SITUACAO = { REALIZADA: ['Realizada', 'pill ok'], CANCELADA: ['Cancelada', 'pill mu'], FALTA: ['Faltou', 'pill falta'], REMARCADA: ['Remarcada', 'pill mu'] };
const LIMITE_TEXTO = 200; // acima disso o resumo fica recolhido, com "Ver mais"

const mesDoItem = (iso) => {
  const t = new Date(iso).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const blocoDia = (iso) => ({
  semana: new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase(),
  dia: new Date(iso).getDate(),
});

// Cinco barrinhas que enchem de acordo com o humor (1 a 5), com a cor do nível
function Humor({ valor }) {
  return (
    <span className="humor" title={`Humor: ${HUMOR[valor]} (${valor} de 5)`}>
      <span className="humor-barras" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => <i key={n} style={{ height: 6 + n * 3, background: n <= valor ? COR_HUMOR[valor] : '#e6ece8' }} />)}
      </span>
      <span className="humor-texto">{HUMOR[valor]}<small> · {valor} de 5</small></span>
    </span>
  );
}

// Resumo grande, recolhido quando é longo
function Resumo({ texto }) {
  const [aberto, setAberto] = useState(false);
  const longo = texto.length > LIMITE_TEXTO;
  return (
    <>
      <p className={`resumo ${longo && !aberto ? 'recolhido' : ''}`}>{texto}</p>
      {longo && <button className="link-pequeno" onClick={() => setAberto(!aberto)}>{aberto ? 'Ver menos' : 'Ver mais'}</button>}
    </>
  );
}

// Cartão de sessão: a consulta (quando existe) vira o cabeçalho e o registro vem dentro
function CartaoSessao({ consulta, registro, aoAdendo }) {
  const quando = consulta ? consulta.inicio : registro.criado_em;
  const b = blocoDia(quando);
  const nome = registro ? registro.profissional_nome : consulta.profissional_nome;
  const tipo = consulta?.tipo;
  const objetivos = (registro?.objetivos || '').split(',').map((o) => o.trim()).filter(Boolean);
  return (
    <article className="tl-cartao">
      <header className="tl-cab">
        <div className="bloco-dia pequeno"><span>{b.semana}</span><b>{b.dia}</b></div>
        <div className="tl-quem">
          <strong>{nome}</strong>
          <small>{[tipo, hora(quando)].filter(Boolean).join(' · ')}</small>
        </div>
        <span className="pill ok">{consulta ? 'Realizada' : 'Sessão'}</span>
      </header>

      {registro && (
        <>
          <Resumo texto={registro.resumo} />
          {(objetivos.length > 0 || registro.humor) && (
            <div className="tl-meta">
              {registro.humor && <Humor valor={registro.humor} />}
              {objetivos.length > 0 && <span className="etiquetas">{objetivos.map((o) => <i key={o} className="etiqueta-obj">{o}</i>)}</span>}
            </div>
          )}
          {registro.observacao && (
            <p className={registro.observacao_interna ? 'tl-nota interna' : 'tl-nota'}>
              {registro.observacao_interna && <Icone nome="cadeado" tamanho={15} />}
              <span><strong>{registro.observacao_interna ? 'Anotação interna · só você vê' : 'Observação'}:</strong> {registro.observacao}</span>
            </p>
          )}
          {registro.adendos.map((a) => (
            <p key={a.id} className="tl-adendo">
              <strong>Adendo · {new Date(a.criado_em).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</strong>
              {a.texto}
            </p>
          ))}
          {aoAdendo && registro.pode_adendo && (
            <button className="link-pequeno tl-acao" onClick={() => aoAdendo(registro.id)}>+ Adicionar adendo</button>
          )}
        </>
      )}
    </article>
  );
}

// Consulta sem registro (faltou, cancelada, remarcada…): uma linha curta, sem cartão grande
function LinhaConsulta({ consulta }) {
  const b = blocoDia(consulta.inicio);
  const [texto, classe] = SITUACAO[consulta.status] || [consulta.status, 'pill mu'];
  return (
    <div className="tl-curta">
      <span className="tl-dia-curto">{b.semana} {b.dia}</span>
      <span className="tl-curta-texto">{hora(consulta.inicio)} · {consulta.profissional_nome}</span>
      <span className={classe}>{texto}</span>
    </div>
  );
}

function Atividade({ atividade }) {
  const b = blocoDia(atividade.criada_em);
  return (
    <div className="tl-curta atividade">
      <span className="tl-dia-curto">{b.semana} {b.dia}</span>
      <span className="tl-curta-texto"><strong>Nova atividade de casa:</strong> {atividade.titulo}<small> · {atividade.profissional_nome}</small></span>
    </div>
  );
}

// Usada pela clínica e pela família. O servidor já decide o que cada um pode ler;
// aqui só se desenha (a observação privada só chega para o próprio autor, marcada como interna).
export default function LinhaDoTempo({ itens, aoAdendo }) {
  const [filtro, setFiltro] = useState('TUDO');
  // Junta a consulta com o registro da mesma sessão
  const registros = itens.filter((i) => i.tipo === 'REGISTRO').map((i) => i.registro);
  const porConsulta = new Map(registros.filter((r) => r.consulta_id).map((r) => [r.consulta_id, r]));
  const usados = new Set();
  const eventos = [];
  for (const i of itens) {
    if (i.tipo === 'CONSULTA') {
      const reg = porConsulta.get(i.consulta.id);
      if (reg) { usados.add(reg.id); eventos.push({ tipo: 'SESSAO', data: i.consulta.inicio, consulta: i.consulta, registro: reg }); }
      else eventos.push({ tipo: 'CONSULTA', data: i.consulta.inicio, consulta: i.consulta });
    } else if (i.tipo === 'ATIVIDADE') {
      eventos.push({ tipo: 'ATIVIDADE', data: i.atividade.criada_em, atividade: i.atividade });
    }
  }
  for (const r of registros) if (!usados.has(r.id)) eventos.push({ tipo: 'SESSAO', data: r.criado_em, registro: r });
  eventos.sort((a, b) => (a.data < b.data ? 1 : -1));

  // Humor das últimas sessões, para ver a tendência de relance
  const humores = eventos.filter((e) => e.tipo === 'SESSAO' && e.registro?.humor).slice(0, 10).reverse();

  // Filtro da lista: "Consultas" inclui as sessões que vieram de uma consulta
  const mostrados = eventos.filter((e) => {
    if (filtro === 'SESSOES') return e.tipo === 'SESSAO';
    if (filtro === 'CONSULTAS') return e.tipo === 'CONSULTA' || (e.tipo === 'SESSAO' && e.consulta);
    if (filtro === 'ATIVIDADES') return e.tipo === 'ATIVIDADE';
    return true;
  });

  let mesAtual = '';
  return (
    <div className="tl">
      <div className="tl-filtros" role="tablist" aria-label="Filtrar a linha do tempo">
        {[['TUDO', 'Tudo'], ['SESSOES', 'Sessões'], ['CONSULTAS', 'Consultas'], ['ATIVIDADES', 'Atividades']].map(([chave, nome]) => (
          <button key={chave} role="tab" aria-selected={filtro === chave} className={filtro === chave ? 'aba ativa' : 'aba'} onClick={() => setFiltro(chave)}>{nome}</button>
        ))}
      </div>
      {mostrados.length === 0 && <p className="vazio">Nada neste filtro.</p>}

      {humores.length >= 3 && (
        <div className="tl-resumo-humor">
          <strong>Humor nas últimas {humores.length} sessões</strong>
          <div className="mini-grafico" role="img" aria-label="Humor nas últimas sessões">
            {humores.map((e, n) => (
              <span key={n} title={`${HUMOR[e.registro.humor]} (${e.registro.humor} de 5)`}>
                <i style={{ height: 8 + e.registro.humor * 7, background: COR_HUMOR[e.registro.humor] }} />
              </span>
            ))}
          </div>
        </div>
      )}

      {mostrados.map((e, n) => {
        const mes = mesDoItem(e.data);
        const novoMes = mes !== mesAtual;
        mesAtual = mes;
        return (
          <div key={`${e.tipo}-${n}`}>
            {novoMes && <h3 className="tl-mes">{mes}</h3>}
            <div className={`tl-item ${e.tipo.toLowerCase()}`}>
              <span className="tl-ponto" aria-hidden="true" />
              {e.tipo === 'SESSAO' && <CartaoSessao consulta={e.consulta} registro={e.registro} aoAdendo={aoAdendo} />}
              {e.tipo === 'CONSULTA' && <LinhaConsulta consulta={e.consulta} />}
              {e.tipo === 'ATIVIDADE' && <Atividade atividade={e.atividade} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
