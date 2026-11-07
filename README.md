# LAÇO

Software para clínicas de crianças com TEA: **sistema da clínica** (computador) e **app dos pais** (celular, no navegador).
Cada clínica vê só os próprios dados, e cada profissional só vê uma criança depois que a família aprova. Tudo roda local, com dados fictícios.

## Instalar e rodar (5 passos)

Precisa de Node.js 20 ou mais novo.

1. `npm run instalar` — instala o back-end e o front-end.
2. Copie `.env.example` para `.env` e escreva um valor longo no `JWT_SECRET`
   (para gerar: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
   Sem isso a demo ainda funciona, mas quem estava logado precisa entrar de novo toda vez que o servidor reinicia.
3. `npm run seed` — cria o banco com os dados da demonstração e mostra o código de ativação do Davi.
4. `npm run dev` — sobe o back (porta 3001) e o front (porta 5173).
5. Abra http://localhost:5173 (clínica) e http://localhost:5173/familia/entrar (pais). Para o celular, use uma janela estreita do navegador (390 px).

## Logins de demonstração (senha `123456`)

| Perfil | Onde entrar | Código da clínica | Usuário |
|---|---|---|---|
| Administração | /entrar | `AURORA` | `admin@laco.test` |
| Profissional (Dra. Ana) | /entrar | `AURORA` | `profissional@laco.test` |
| Recepção | /entrar | `AURORA` | `recepcao` (sem e-mail) |
| Responsável (Mariana) | /familia/entrar | não tem | `responsavel@laco.test` |

Também existem Carlos (`carlos@laco.test`, já aprovado para o Theo) e Paulo (`paulo@laco.test`) na Aurora, e a Clínica Horizonte (`HORIZONTE`, `marina@horizonte.test`), usados na demonstração.
Senha fraca só na demonstração: qualquer senha criada pelo sistema exige 8 caracteres.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | back-end e front-end juntos |
| `npm run seed` | recria o banco com os dados da demonstração (datas sempre relativas a hoje) |
| `npm test` | roda os 146 testes automáticos (inclui o ensaio da demonstração) |
| `npm run limpeza` | inativa pré-cadastros sem ativação em 30 dias e exclui aos 90 |

Se o `seed` disser que não consegue apagar `backend/dados/laco.db`, pare o `npm run dev` antes (o arquivo está em uso) e rode de novo.

## Para a apresentação

- Rode `npm run seed` no mesmo dia e deixe 3 janelas já logadas (recepção, profissional, responsável), com zoom em 125%.
- Roteiro e tempos: [docs/09-entrega-e-demo.md](docs/09-entrega-e-demo.md) (seção 3) e [docs/10-roteiro-apresentacao.md](docs/10-roteiro-apresentacao.md).
- Para repetir a demo, é só rodar `npm run seed` de novo.

## Regras que não quebram

1. Profissional só vê criança com vínculo **aprovado** pela família, dentro do que a família liberou.
2. A observação "Só para mim" do profissional nunca aparece para a família, para outros profissionais, na administração, na recepção, na exportação ou no relatório.
3. Cada clínica vê só as próprias consultas. O aviso de conflito com outra clínica é só "sim/não", na tela Nova consulta.
4. A administração não acessa dados clínicos; a recepção vê só cadastro e agenda.
5. Avisos só dentro do app (nada de e-mail ou WhatsApp reais). Dados sempre fictícios.

## Onde está cada coisa

- `backend/` — Node + Express + SQLite (`src/controllers`, `src/routes`, `src/middlewares`, `tests`).
- `frontend/` — React + Vite, CSS puro (`src/pages`, `src/components`, `src/styles`).
- `docs/` — planejamento, regras, telas desenhadas e plano de testes. Comece por [docs/README.md](docs/README.md).

## Limites da versão de demonstração

SQLite sem criptografia em repouso, textos legais em rascunho (dependem de revisão jurídica), prazos de 30/90 dias e regra para divergência entre responsáveis são sugestões. Veja [docs/09-entrega-e-demo.md](docs/09-entrega-e-demo.md), seções 6 e 7.
