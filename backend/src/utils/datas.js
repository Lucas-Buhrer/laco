// Datas em texto ISO (UTC, sem fuso), no mesmo formato em todo o código novo: 2026-11-07T14:00:00
function agoraIso() {
  return new Date().toISOString().slice(0, 19);
}

function maisDias(dias) {
  return new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString().slice(0, 19);
}

// Aceita só AAAA-MM-DD e confere se a data existe de verdade
function dataValida(texto) {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const d = new Date(texto + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}

module.exports = { agoraIso, maisDias, dataValida };
