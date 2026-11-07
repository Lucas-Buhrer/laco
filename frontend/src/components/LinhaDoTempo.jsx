import { diaCurto, hora } from '../utils/consultas.js';

const HUMOR = { 1: 'muito difícil', 2: 'agitado', 3: 'tranquilo', 4: 'bem', 5: 'ótimo' };
const SITUACAO = { REALIZADA: 'Realizada', CANCELADA: 'Cancelada', FALTA: 'Faltou', REMARCADA: 'Remarcada' };

// Usada pela clínica e pela família. O servidor já decide o que cada um pode ler;
// aqui só se desenha (a observação privada só chega para o próprio autor, marcada como interna).
export default function LinhaDoTempo({ itens, aoAdendo }) {
  return (
    <div className="linha-tempo">
      {itens.map((i, n) => {
        if (i.tipo === 'REGISTRO') {
          const r = i.registro;
          return (
            <article key={`r${r.id}`} className="cartao">
              <p className="etiqueta">Sessão · {diaCurto(r.criado_em)}, {hora(r.criado_em)} · {r.profissional_nome}</p>
              <p>{r.resumo}</p>
              {r.objetivos && <p className="detalhe">Objetivos: {r.objetivos}</p>}
              {r.humor && <p className="detalhe">Humor: {HUMOR[r.humor]} ({r.humor} de 5)</p>}
              {r.observacao && (
                <p className={r.observacao_interna ? 'obs obs-interna' : 'obs'}>
                  <strong>{r.observacao_interna ? 'Anotação interna · só você vê' : 'Observação'}:</strong> {r.observacao}
                </p>
              )}
              {r.adendos.map((a) => (
                <p key={a.id} className="obs"><strong>Adendo · {diaCurto(a.criado_em)}:</strong> {a.texto}</p>
              ))}
              {aoAdendo && r.pode_adendo && (
                <button className="botao-sec" onClick={() => aoAdendo(r.id)}>Adicionar adendo</button>
              )}
            </article>
          );
        }
        if (i.tipo === 'CONSULTA') {
          return (
            <article key={`c${i.consulta.id}`} className="cartao">
              <p className="etiqueta">Consulta · {diaCurto(i.consulta.inicio)}, {hora(i.consulta.inicio)}</p>
              <p>{SITUACAO[i.consulta.status]} · {i.consulta.profissional_nome}</p>
            </article>
          );
        }
        return (
          <article key={`a${i.atividade.id}-${n}`} className="cartao">
            <p className="etiqueta">Atividade de casa · {diaCurto(i.atividade.criada_em)}</p>
            <p>{i.atividade.titulo} · {i.atividade.profissional_nome}</p>
          </article>
        );
      })}
    </div>
  );
}
