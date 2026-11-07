import { useAuth } from '../context/AuthContext.jsx';

// Telas provisórias: os painéis de verdade vêm nas tarefas T-19 e T-33.
export function PainelClinica() {
  const { usuario } = useAuth();
  return (
    <>
      <h1>Olá, {usuario.nome}</h1>
      <p className="subtitulo">Painel da clínica. Em construção.</p>
    </>
  );
}

export function HojeFamilia() {
  const { usuario, sair } = useAuth();
  return (
    <>
      <h1>Olá, {usuario.nome.split(' ')[0]}</h1>
      <p className="subtitulo">Tela "Hoje". Em construção.</p>
      <button className="botao-sec" onClick={sair}>Sair</button>
    </>
  );
}

export function EmConstrucao() {
  return (
    <>
      <h1>Em construção</h1>
      <p className="subtitulo">Esta tela ainda será feita.</p>
    </>
  );
}

export function SemPermissao() {
  return (
    <main className="conteudo">
      <h1>Sem permissão</h1>
      <p className="subtitulo">Você não pode abrir esta página com a sua conta.</p>
      <a className="botao" href="/">Voltar ao início</a>
    </main>
  );
}
