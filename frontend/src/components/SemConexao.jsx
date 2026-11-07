import { useEffect, useState } from 'react';

// Desenho: docs/telas/M21. O api.js avisa (evento "sem-conexao") quando o servidor não responde;
// o aviso fica no topo de qualquer tela e some sozinho quando a conexão volta.
export default function SemConexao() {
  const [sem, setSem] = useState(false);
  useEffect(() => {
    const cair = () => setSem(true);
    const voltar = () => setSem(false);
    window.addEventListener('sem-conexao', cair);
    window.addEventListener('com-conexao', voltar);
    window.addEventListener('online', voltar);
    return () => {
      window.removeEventListener('sem-conexao', cair);
      window.removeEventListener('com-conexao', voltar);
      window.removeEventListener('online', voltar);
    };
  }, []);

  if (!sem) return null;
  return (
    <div className="faixa-sem-conexao" role="alert">
      <span><strong>Sem conexão.</strong> Não conseguimos falar com o servidor agora. Seus dados continuam seguros. Confira a internet e tente de novo.</span>
      <button className="botao-sec" onClick={() => window.location.reload()}>Tentar de novo</button>
    </div>
  );
}
