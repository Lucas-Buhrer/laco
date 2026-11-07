// Os painéis de verdade estão em pages/clinica/PainelClinica.jsx e pages/familia/Hoje.jsx.
export function SemPermissao() {
  return (
    <main className="conteudo">
      <h1>Sem permissão</h1>
      <p className="subtitulo">Você não pode abrir esta página com a sua conta.</p>
      <a className="botao" href="/">Voltar ao início</a>
    </main>
  );
}
