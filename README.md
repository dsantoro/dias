# Dias

App vertical de contagem de dias com React, TypeScript, Vite, Express e Supabase.

## Executar

Requer Node.js 24 ou superior e um projeto Supabase configurado no arquivo `.env`.

```sh
npm install
npm run dev
```

O comando inicia Vite e a API juntos. A API escuta em `127.0.0.1:3001`; o Vite encaminha `/api` para ela. Para executar separadamente: `npm run api` e `npm run dev:web`.

## Usuarios e Dados

Em `/usuarios`, crie uma conta com senha ou entre com a senha de um usuario existente. As senhas sao armazenadas como hashes scrypt. A sessao usa cookie HttpOnly, SameSite=Lax, com validade de sete dias. Trocar usuario revoga a sessao atual.

No Supabase, execute [`supabase/schema.sql`](supabase/schema.sql) pelo SQL Editor para criar as tabelas `users`, `sessions` e `events`. O servidor usa `SUPABASE_URL` e `SUPABASE_SECRET_KEY`; a chave secreta deve permanecer somente no servidor e nunca ser incluida no frontend. `SUPABASE_PUBLISHABLE_KEY` nao e usada pela API.

Usuarios, sessoes e datas ficam no Supabase. A API nunca aceita o dono informado pelo cliente: usa o usuario da sessao para listar, criar, editar e excluir. O banco SQLite anterior nao e migrado automaticamente; os dados que ja estavam em `data/dias.db` precisam ser importados separadamente se forem necessarios.

As datas nao usam mais localStorage. Registros antigos do navegador permanecem intactos, mas nao sao importados automaticamente porque nao possuem dono.

Variavel opcional: `API_PORT` (padrao `3001`). Use `API_PORT` no comando que inicia ambos os servicos para manter o proxy alinhado.

## Verificar

```sh
npm test
npm run build
npm run lint
```

Os testes cobrem criacao de usuarios, validacao e verificacao de senha, sessoes expiradas e isolamento entre usuarios.

## Producao Local

```sh
npm run build
npm start
```

O Express serve o build e o fallback das rotas `/`, `/nova`, `/editar/:id` e `/usuarios`, sem `#`. Nao use `vite preview` como servidor completo: ele nao inicia a API.

## Vercel

O handler `api/[...path].js` encaminha as rotas `/api/*` para a API Express. Configure `SUPABASE_URL` e `SUPABASE_SECRET_KEY` nas Environment Variables do projeto Vercel para cada ambiente e faça um novo deploy. A chave secreta nao deve ser adicionada ao frontend nem ao repositorio.
