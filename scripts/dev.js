// Sobe back e front juntos, sem biblioteca extra (lista de dependências é fechada).
const { spawn } = require('node:child_process');

function subir(nome, pasta) {
  // shell: true para o npm funcionar no Windows
  const proc = spawn('npm', ['run', 'dev'], { cwd: pasta, shell: true, stdio: 'pipe' });
  const prefixar = (dado) =>
    dado.toString().split('\n').filter(Boolean).forEach((l) => console.log(`[${nome}] ${l}`));
  proc.stdout.on('data', prefixar);
  proc.stderr.on('data', prefixar);
  proc.on('exit', (codigo) => console.log(`[${nome}] encerrou (${codigo})`));
  return proc;
}

const processos = [subir('back', 'backend'), subir('front', 'frontend')];

// Ctrl+C derruba os dois
process.on('SIGINT', () => {
  processos.forEach((p) => p.kill());
  process.exit();
});
