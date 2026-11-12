// Legenda de cores dos desenhos D4 e D15c
const ITENS = [
  ['cor-verde', 'Confirmada'],
  ['cor-amarela', 'Sem confirmação'],
  ['cor-vermelha', 'Falta 1 dia: ligar'],
  ['cor-azul', 'Restam X dias'],
  ['cor-passou', 'Passou, falta registrar'],
];
const FINAIS = [
  ['cor-realizada', 'Realizada'],
  ['cor-remarcada', 'Remarcada'],
  ['cor-cancelada', 'Cancelada'],
  ['cor-falta', 'Faltou'],
];

export default function LegendaAgenda() {
  return (
    <div className="legenda-agenda" aria-label="Legenda das cores">
      <span className="grupo">{ITENS.map(([c, t]) => <span key={t} className="item"><i className={`amostra ${c}`} />{t}</span>)}</span>
      <span className="grupo separado">{FINAIS.map(([c, t]) => <span key={t} className="item"><i className={`amostra ${c}`} />{t}</span>)}</span>
    </div>
  );
}
