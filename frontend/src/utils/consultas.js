// Formatação e frases das consultas (cores e textos do doc 06)

export const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
export const diaCurto = (iso) => new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
export const diaLongo = (iso) => new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

// 'AAAA-MM-DD' de hoje, em hora local
export function hojeISO() {
  return dataISO(new Date());
}
export function dataISO(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function somarDias(iso, dias) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return dataISO(d);
}

// Frase de situação que a clínica lê na agenda
export function frase(c) {
  if (c.status === 'REALIZADA') return 'Realizada';
  if (c.status === 'CANCELADA') return 'Cancelada';
  if (c.status === 'FALTA') return 'Faltou';
  if (c.status === 'REMARCADA') return c.remarcada_para ? `Remarcada para ${diaCurto(c.remarcada_para)}, ${hora(c.remarcada_para)}` : 'Remarcada';
  if (c.aguardando_aprovacao) return 'Aguardando aprovação da família';
  if (c.cor === 'VERDE') return c.confirmada_por === 'CONTATO' ? 'Confirmada por contato' : 'Confirmada pelos responsáveis';
  if (c.cor === 'VERMELHA') return 'Falta 1 dia: ligar para os responsáveis';
  return `Restam ${c.dias_restantes} dias · sem confirmação`;
}

// Classe de cor: estado final ou cor da agenda dinâmica
export function classeCor(c) {
  if (c.status !== 'AGENDADA') return `cor-${c.status.toLowerCase()}`;
  return `cor-${(c.cor || 'AZUL').toLowerCase()}`;
}
