# LAÇO — instruções de trabalho

Software B2B para clínicas de crianças com TEA: sistema da clínica (computador) + app dos pais (celular, web responsivo). Multi-clínica, LGPD. Demo de apresentação: tudo roda LOCAL.

## Stack e estilo (obrigatório)
- Front: React + Vite, JavaScript, CSS puro. Back: Node + Express, JavaScript puro. Banco: SQLite. Login: JWT + bcrypt.
- Código SIMPLES, sem abstrações espertas e sem bibliotecas novas sem perguntar. Comentários em PORTUGUÊS, curtos, explicando o porquê.
- Nomes de variáveis, rotas e tabelas em português, como nos docs.
- Textos da interface: português simples, sem jargão. Botões e campos pouco arredondados (12px, como nos desenhos; nada de forma de pílula).

## Regras que nunca podem quebrar
1. Profissional só acessa criança com vínculo APROVADO pelo responsável, dentro do escopo aprovado. Toda leitura clínica passa pela regra central de acesso (T-17).
2. "Observação" privada do profissional nunca aparece para a família nem em exportação/relatório.
3. Cada clínica vê só as próprias consultas. O aviso de conflito com outra clínica é genérico (sim/não), só na tela "Nova consulta".
4. Admin da clínica não acessa dados clínicos. Recepção só dados cadastrais e agenda; senha da recepção só pelo admin.
5. Responsável confirma presença até 1 dia antes; depois, só a clínica registra "Confirmada por contato". Consulta nunca é cancelada sozinha.
6. Avisos só dentro do app. Nada de e-mail/WhatsApp reais. Dados sempre fictícios.
7. Nunca gravar segredo no repositório; usar `.env` (existe `.env.example`).

## Onde está cada coisa (leia SÓ o que a tarefa pede)
- `docs/07-plano-de-tarefas.md`: tarefas T-xx, blocos, DoD. Ponto de partida.
- `docs/02-prd.md`: RF-xx e RN-xx. `docs/05-arquitetura-e-dados.md`: tabelas e rotas.
- `docs/08-plano-de-testes.md`: casos F-xx e S-xx. `docs/06-telas-e-ux.md`: textos e fluxos.
- `docs/telas/*.dc.html`: desenho de cada tela (abra só a tela que vai construir).
- `docs/09-entrega-e-demo.md`: logins e seed da demo.

## Como trabalhar
1. Uma tarefa (T-xx) por vez. Leia a linha dela no doc 07 e apenas os RF/RN/casos citados.
2. Mudança grande ou que mexe em acesso/vínculo: proponha o plano (arquivos que vai tocar) e espere "ok".
3. Implemente seguindo a tela desenhada. Reaproveite o módulo anterior como padrão.
4. Rode o teste da tarefa (`npm test`) antes de dizer que terminou. Se não puder rodar, diga.
5. Marque a tarefa como feita no doc 07 e faça um commit pequeno: `T-xx: resumo`.
6. Resposta final: 2 a 4 linhas (o que ficou pronto, o que testou, o próximo passo). Sem recapitular o código.

## Economia
- Não releia arquivos já lidos; não liste pastas inteiras; use busca (grep) em vez de abrir muitos arquivos.
- Não reescreva arquivos inteiros para mudanças pequenas: edite o trecho.
- Se faltar informação, assuma o mais simples e registre a suposição em uma linha. Pergunte só se for decisão irreversível ou de segurança.

## Comandos
- `npm run dev` (back e front) · `npm run seed` (recria o banco com os logins de demo) · `npm test` · `npm run limpeza`
