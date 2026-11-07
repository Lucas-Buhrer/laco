import { Link } from 'react-router-dom';
import { classeCor, frase, hora } from '../utils/consultas.js';

const ALTURA_HORA = 64; // px por hora, como nos desenhos D4 e D15

// Grade de horários: uma coluna por dia (profissional) ou por profissional (recepção).
// colunas: [{ id, titulo, subtitulo, hoje }]   eventos: { [idDaColuna]: consultas[] }
export default function GradeHoraria({ colunas, eventos }) {
  // Das 8h às 17h; se houver consulta fora disso, a grade cresce para mostrá-la
  const horas = Object.values(eventos).flat().map((c) => new Date(c.inicio).getHours());
  const primeira = Math.min(8, ...horas);
  const ultima = Math.max(16, ...horas);
  const linhas = [];
  for (let h = primeira; h <= ultima; h++) linhas.push(h);
  const alturaColuna = linhas.length * ALTURA_HORA;

  return (
    <div className="grade" style={{ gridTemplateColumns: `72px repeat(${colunas.length}, minmax(${colunas.length > 6 ? 150 : 120}px, 1fr))` }}>
      <div className="grade-cab" />
      {colunas.map((c) => (
        <div key={c.id} className={`grade-cab ${c.hoje ? 'hoje' : ''}`}>
          <span>{c.titulo}{c.hoje && <b className="marca-hoje">HOJE</b>}</span>
          {c.subtitulo && <small>{c.subtitulo}</small>}
        </div>
      ))}

      <div>
        {linhas.map((h) => <div key={h} className="hl">{String(h).padStart(2, '0')}:00</div>)}
      </div>
      {colunas.map((col) => (
        <div key={col.id} className={`col ${col.hoje ? 'col-hoje' : ''}`} style={{ height: alturaColuna }}>
          {(eventos[col.id] || []).map((c) => {
            const d = new Date(c.inicio);
            const topo = (d.getHours() - primeira) * ALTURA_HORA + (d.getMinutes() / 60) * ALTURA_HORA + 2;
            const altura = Math.max(ALTURA_HORA - 4, (c.duracao_min / 60) * ALTURA_HORA - 4);
            return (
              <Link key={c.id} to={`/clinica/agenda/${c.id}`} className={`ev ${classeCor(c)}`} style={{ top: topo, height: altura }}>
                <b>{hora(c.inicio)}</b> {c.status === 'CANCELADA' ? <s>{c.crianca_nome}</s> : c.crianca_nome}
                <span>{prefixo(c)}{frase(c)}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Sinais do desenho D15c para o que já passou
function prefixo(c) {
  if (c.status === 'REALIZADA') return '✓ ';
  if (c.status === 'CANCELADA') return '✕ ';
  if (c.status === 'REMARCADA') return '→ ';
  return '';
}
