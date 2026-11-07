import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Título da aba do navegador conforme a tela ("Agenda · LAÇO")
const TITULOS = [
  ['/clinica/pre-cadastros', 'Pré-cadastros'], ['/clinica/criancas', 'Crianças'], ['/clinica/agenda', 'Agenda'],
  ['/clinica/codigo-da-familia', 'Código da família'], ['/clinica/conta', 'Conta'], ['/clinica/avisos', 'Avisos'],
  ['/clinica/equipe', 'Equipe'], ['/clinica/clinica', 'Clínica'], ['/clinica', 'Painel'],
  ['/familia/agenda', 'Agenda'], ['/familia/atividades', 'Atividades'], ['/familia/acessos', 'Quem tem acesso'], ['/familia/mais', 'Mais'],
  ['/familia/avisos', 'Avisos'], ['/familia/filhos', 'Meus filhos'], ['/familia/linha-do-tempo', 'Linha do tempo'], ['/familia/relatorio', 'Relatório'],
  ['/familia/solicitacoes', 'Pedidos de acesso'], ['/familia/responsaveis', 'Responsáveis'], ['/familia/privacidade', 'Privacidade'],
  ['/familia/quem-acessou', 'Quem acessou'], ['/familia/convidar', 'Convidar outra clínica'], ['/familia', 'Hoje'],
];
export default function useTitulo() {
  const { pathname } = useLocation();
  useEffect(() => {
    const achado = TITULOS.find(([prefixo]) => pathname === prefixo || pathname.startsWith(prefixo + '/'));
    document.title = achado ? `${achado[1]} · LAÇO` : 'LAÇO';
  }, [pathname]);
}
