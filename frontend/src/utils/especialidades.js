// Mesma lista fixa do servidor (backend/src/utils/especialidades.js)
export const ESPECIALIDADES = {
  PSICOLOGO: 'Psicólogo(a)',
  PSICOLOGO_ABA: 'Psicólogo(a) ABA',
  PSIQUIATRA_INFANTIL: 'Psiquiatra infantil',
  NEUROPEDIATRA: 'Neuropediatra',
  PEDIATRA_DESENVOLVIMENTO: 'Pediatra do desenvolvimento',
  PSICOPEDAGOGO: 'Psicopedagogo(a)',
  FISIOTERAPEUTA: 'Fisioterapeuta',
  TERAPEUTA_OCUPACIONAL: 'Terapeuta ocupacional',
  FONOAUDIOLOGO: 'Fonoaudiólogo(a)',
  NUTRICIONISTA: 'Nutricionista',
  DENTISTA_ESPECIAL: 'Dentista (atendimento especial)',
  MUSICOTERAPEUTA: 'Musicoterapeuta',
  PSICOMOTRICISTA: 'Psicomotricista',
  ACOMPANHANTE_TERAPEUTICO: 'Acompanhante terapêutico',
  MEDIADOR_ESCOLAR: 'Mediador(a) escolar',
  ASSISTENTE_SOCIAL: 'Assistente social',
  OUTRO: 'Outro',
};

// Aceita a linha de um usuário ou de um vínculo
export function nomeEspecialidade(linha) {
  if (linha.especialidade === 'OUTRO') return linha.especialidade_outro || 'Outro';
  return ESPECIALIDADES[linha.especialidade] || '';
}
