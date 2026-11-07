import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

// Desenho: docs/telas/D2 (profissional) e D7 (administrador). A agenda do dia entra com a T-30.
// Cada papel só pede o que pode ver: o admin e a recepção nunca chamam rotas clínicas.
export default function PainelClinica() {
  const { usuario } = useAuth();
  const [n, setN] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function carregar() {
      const pre = await api.get('/clinica/pre-cadastros');
      const semAtivar = pre.filter((c) => c.status === 'AGUARDANDO_ATIVACAO').length;
      if (usuario.papel === 'PROFISSIONAL') {
        const [criancas, vinculos] = await Promise.all([api.get('/criancas'), api.get('/vinculos')]);
        return { criancas: criancas.length, pendentes: vinculos.filter((v) => v.status === 'PENDENTE').length, semAtivar };
      }
      if (usuario.papel === 'ADMIN_CLINICA') {
        const prof = await api.get('/clinica/profissionais');
        return { profissionais: prof.filter((p) => p.ativo).length, criancasClinica: pre.filter((c) => c.status !== 'INATIVO').length, semAtivar };
      }
      return { semAtivar };
    }
    carregar().then(setN).catch((e) => setErro(e.message));
  }, [usuario.papel]);

  const primeiroNome = usuario.nome.split(' ')[0];

  return (
    <>
      <h1>Olá, {primeiroNome}</h1>
      <p className="subtitulo">{usuario.clinica?.nome}</p>
      {erro && <p className="aviso-erro" role="alert">{erro}</p>}

      <div className="acoes-topo">
        <Link className="botao" to="/clinica/pre-cadastros">Novo pré-cadastro</Link>
        {usuario.papel === 'ADMIN_CLINICA' && <Link className="botao-sec" to="/clinica/equipe">Cadastrar profissional</Link>}
        {usuario.papel === 'PROFISSIONAL' && <Link className="botao-sec" to="/clinica/codigo-da-familia">Código da família</Link>}
      </div>

      {n && (
        <div className="numeros">
          {usuario.papel === 'PROFISSIONAL' && (
            <>
              <div className="numero"><strong>{n.criancas}</strong>crianças com acesso aprovado</div>
              <div className="numero"><strong>{n.pendentes}</strong>aguardando aprovação dos pais</div>
            </>
          )}
          {usuario.papel === 'ADMIN_CLINICA' && (
            <>
              <div className="numero"><strong>{n.profissionais}</strong>profissionais ativos</div>
              <div className="numero"><strong>{n.criancasClinica}</strong>crianças da clínica</div>
            </>
          )}
          <div className="numero"><strong>{n.semAtivar}</strong>pré-cadastros sem ativação</div>
        </div>
      )}

      {usuario.papel === 'ADMIN_CLINICA' && (
        <div className="caixa">
          <h2>O que a administração não vê</h2>
          <p>Registros, atividades e relatórios das crianças. Aqui aparecem só equipe, agenda e cadastros.</p>
        </div>
      )}
      {usuario.papel === 'PROFISSIONAL' && (
        <p className="nota">Enquanto não houver aprovação dos pais, só aparecem os dados cadastrais.</p>
      )}
    </>
  );
}
