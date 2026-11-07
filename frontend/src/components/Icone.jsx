// Ícones dos desenhos (traço de 1,75 px, 24×24). Só os que o menu usa.
const CAMINHOS = {
  painel: <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
  criancas: <><circle cx="9" cy="8" r="3.5" /><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" /><path d="M16 5a3.5 3.5 0 0 1 0 7M18 14c2 .8 3 2.7 3 6" /></>,
  precadastro: <><circle cx="10" cy="8" r="3.5" /><path d="M4 20c0-3.5 2.7-6 6-6s6 2.5 6 6M19 8v6M16 11h6" /></>,
  agenda: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></>,
  codigo: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  conta: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>,
  clinica: <path d="M4 20V8l8-4 8 4v12M9 20v-6h6v6" />,
  sair: <path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9" />,
  avisos: <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" />,
  atividades: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.7 2.7L16 9.5" /></>,
  acessos: <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />,
  tempo: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  relatorio: <path d="M7 3h8l4 4v14H7zM14 3v5h5M10 13h6M10 17h6" />,
  olho: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  cadeado: <path d="M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3" />,
  mais: <><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></>,
};

export default function Icone({ nome, tamanho = 20 }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      {CAMINHOS[nome]}
    </svg>
  );
}
