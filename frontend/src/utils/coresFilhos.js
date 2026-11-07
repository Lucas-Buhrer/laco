// Cada filho tem a sua cor no app (verde, roxo, azul, laranja), como no desenho M1
export const CORES = [
  { fundo: '#cdebd6', texto: '#123b2b', bloco: '#e4f4e9', dia: '#1f6b4a', numero: '#123b2b' },
  { fundo: '#e9ddf7', texto: '#3b2a5c', bloco: '#f1eafa', dia: '#5b3f8c', numero: '#3b2a5c' },
  { fundo: '#dcebfa', texto: '#12395f', bloco: '#e8f2fc', dia: '#2f6fa8', numero: '#12395f' },
  { fundo: '#fdf0e3', texto: '#7a4a12', bloco: '#fef6ec', dia: '#a8651c', numero: '#7a4a12' },
];
export const corDoFilho = (indice) => CORES[Math.max(0, indice) % CORES.length];
