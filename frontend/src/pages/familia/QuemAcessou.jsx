import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api.js';

const dia = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

// Desenho: docs/telas/M11. Mostra tudo o que foi feito com os dados do filho. Não existe como apagar.
export default function QuemAcessou() {
  const [filhos, setFilhos] = useState(null);
  const [filhoId, setFilhoId] = useState('');
  const [quem, setQuem] = useState(''); // filtro por profissional
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    api.get('/criancas').then((c) => { setFilhos(c); if (c[0]) setFilhoId(c[0].id); }).catch((e) => setErro(e.message));
  }, []);
  useEffect(() => {
    if (!filhoId) return;
    setDados(null);
    api.get(`/criancas/${filhoId}/acessos${quem ? `?profissional_id=${quem}` : ''}`).then(setDados).catch((e) => setErro(e.message));
  }, [filhoId, quem]);

  // Agrupa por dia
  const grupos = {};
  (dados?.acessos || []).forEach((a) => {
    const chave = dia(a.quando);
    (grupos[chave] = grupos[chave] || []).push(a);
  });

  return (
    <>
      <Link to="/familia/acessos" className="voltar">‹ Voltar</Link>
      <h1>Quem acessou</h1>
      <p className="subtitulo">Todo acesso aos dados do seu filho fica registrado. Este histórico não pode ser apagado.</p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}

      {filhos && filhos.length > 1 && (
        <label className="campo">Filho
          <select value={filhoId} onChange={(e) => { setFilhoId(e.target.value); setQuem(''); }}>
            {filhos.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </label>
      )}
      {dados && dados.profissionais.length > 0 && (
        <div className="abas">
          <button className={quem === '' ? 'aba ativa' : 'aba'} onClick={() => setQuem('')}>Todos</button>
          {dados.profissionais.map((p) => (
            <button key={p.id} className={quem === String(p.id) ? 'aba ativa' : 'aba'} onClick={() => setQuem(String(p.id))}>{p.nome.split(' ')[0]}</button>
          ))}
        </div>
      )}

      {dados && dados.acessos.length === 0 && <p className="vazio">Ninguém acessou ainda.</p>}
      {Object.entries(grupos).map(([d, itens]) => (
        <section key={d}>
          <p className="etiqueta">{d}</p>
          {itens.map((a) => (
            <div key={a.id} className="cartao linha-acesso">
              <span>{a.quem} {a.acao}{a.clinica && <small> · {a.clinica}</small>}</span>
              <time>{hora(a.quando)}</time>
            </div>
          ))}
        </section>
      ))}
    </>
  );
}
