// Datas em texto, HORA LOCAL, sem fuso: 2026-11-07T14:00:00.
// Um formato só em todo o sistema (código, seed e padrão do banco), para comparar texto com texto.
const pad = (n) => String(n).padStart(2, '0');

function formatar(data) {
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}:${pad(data.getSeconds())}`;
}

function agoraIso() {
  return formatar(new Date());
}

function maisDias(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return formatar(d);
}

// Aceita só AAAA-MM-DD e confere se a data existe de verdade
function dataValida(texto) {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const d = new Date(texto + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}

module.exports = { agoraIso, maisDias, dataValida, formatar };
