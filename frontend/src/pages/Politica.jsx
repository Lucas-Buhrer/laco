import { Link } from 'react-router-dom';

// Desenho: docs/telas/D22. Página pública, em linguagem simples (RF-76).
export default function Politica() {
  return (
    <main className="pagina-publica">
      <img className="logo" src="/laco-logo.svg" alt="laço" />
      <h1>Política de privacidade</h1>
      <p className="subtitulo">Linguagem simples. Esta é a versão de demonstração; o texto definitivo passará por revisão jurídica.</p>

      <h2>Quem vê os dados</h2>
      <p>Cada profissional só vê os dados da criança depois que a família aprova. A clínica, antes disso, vê só o cadastro básico.</p>
      <h2>O que guardamos</h2>
      <p>Só o necessário: nome, data de nascimento, contato do responsável, consultas, atividades e registros compartilhados. Não pedimos CPF.</p>
      <h2>Seus direitos</h2>
      <p>Você pode retirar o acesso de qualquer profissional, ver quem acessou, baixar seus dados, revogar o consentimento e pedir a exclusão.</p>
      <h2>Quanto tempo guardamos</h2>
      <p>Cadastros que a família não ativa ficam inativos em 30 dias e são excluídos em 90.</p>
      <p className="nota">O texto final depende de revisão jurídica.</p>
      <p><Link to="/">Voltar</Link></p>
    </main>
  );
}
