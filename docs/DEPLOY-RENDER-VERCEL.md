# Deploy: API no Render + site na Vercel

Roteiro para subir o **backend (NestJS)** no Render e o **frontend (Next.js)** na Vercel, com banco **PostgreSQL** (ex.: Neon).

**Site em produção:** [https://lbteam.vercel.app](https://lbteam.vercel.app)

---

## Blueprint (`render.yaml`)

Na raiz do repo existe **`render.yaml`**: define o serviço **lb-team-api** (Node 20, free), build/start do monorepo, `preDeploy` com `db:migrate:deploy`, `FRONTEND_URL=https://lbteam.vercel.app`, `JWT_SECRET` gerado pelo Render, e **`DATABASE_URL`** para você colar a URL do **Neon** ao aplicar o Blueprint.

### Passos no Render

1. [Dashboard](https://dashboard.render.com) → **New** → **Blueprint** → conecte o repositório Git.  
2. O Render lê `render.yaml`. Quando pedir, informe **`DATABASE_URL`** (connection string do Neon).  
3. Após o deploy, anote a URL da API, ex.: `https://lb-team-api.onrender.com`.  
4. **Vercel** → projeto **lbteam** → **Settings → Environment Variables** → `NEXT_PUBLIC_API_URL` = URL da API (https, **sem** `/` no final) → **Redeploy** (o Next embute essa variável no build).  
5. **Seed (uma vez):** na sua máquina, com `DATABASE_URL` do Neon na raiz do repo:

   ```bash
   npm ci && npm run db:seed
   ```

   (As migrações já rodam no `preDeploy` do Render; o seed cria admin/personal/nutri demo.)

---

## Ordem recomendada (manual, se não usar Blueprint)

1. Banco (Neon) → URL de conexão  
2. API no Render → URL pública `https://….onrender.com`  
3. Migrações + seed (uma vez) contra o Neon — *com Blueprint, migrate já vai no `preDeploy`; falta só o seed.*  
4. Site na Vercel com `NEXT_PUBLIC_API_URL` = URL da API  
5. `FRONTEND_URL` na API = `https://lbteam.vercel.app` — *já está no `render.yaml`.*

Assim o build do Next já “enxerga” a API correta (`NEXT_PUBLIC_*` é embutido no build).

---

## 1. PostgreSQL (Neon)

1. Crie um projeto em [neon.tech](https://neon.tech).  
2. Copie a **connection string** Postgres (modo **pooling** costuma ser bom para serverless/PaaS; se der erro de SSL, use a string que o Neon indica com `?sslmode=require`).  
3. Guarde como `DATABASE_URL` — será a mesma na API e nos comandos locais de migrate.

---

## 2. Web Service no Render (API)

1. **New** → **Web Service** → conecte o repositório Git.  
2. **Name:** ex. `lb-team-api`  
3. **Region:** o mais próximo dos usuários.  
4. **Branch:** `main` (ou a que vocês usam).  
5. **Root directory:** deixe **vazio** (raiz do monorepo).  
6. **Runtime:** Node  
7. **Build command:**

   ```bash
   npm ci && npm run db:generate && npm run build --workspace=@lb-team/api
   ```

8. **Start command:**

   ```bash
   npm run start:prod --workspace=@lb-team/api
   ```

9. **Instance type:** Free (aceite o cold start na primeira requisição após inatividade).

### Variáveis de ambiente (Render → Environment)

| Nome | Valor / observação |
|------|---------------------|
| `NODE_VERSION` | `20` (ou a mesma do `engines` do `package.json`) |
| `DATABASE_URL` | Connection string do Neon (a mesma do passo 1) |
| `JWT_SECRET` | String longa e aleatória (não reutilize a de dev) |
| `FRONTEND_URL` | Produção: **`https://lbteam.vercel.app`** (sem barra no final). No Blueprint já vem fixo. Se precisar de mais de um domínio, separe por vírgula. |
| `PORT` | **Não defina manualmente** — o Render injeta. A API já lê `PORT` ou `API_PORT`. |

**Não** commite `.env` com segredos; só o painel do Render.

10. Faça o **primeiro deploy**. Anote a URL pública, ex.: `https://lb-team-api.onrender.com`.

---

## 3. Migrações e seed (uma vez)

Com o `DATABASE_URL` do Neon disponível **na sua máquina** (export ou `.env` na raiz / `packages/database`):

Na **raiz** do repositório:

```bash
export DATABASE_URL="postgresql://..."   # Neon
npm ci
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
```

Isso cria as tabelas e os usuários demo no banco que a API no Render vai usar.

**Alternativa:** use o **Shell** do Render (se disponível no plano) com o mesmo `DATABASE_URL` e os mesmos comandos a partir da raiz.

---

## 4. Vercel (frontend)

1. **Import project** → mesmo repositório.  
2. **Framework:** Next.js  
3. **Root Directory:** `apps/web`  
4. **Build & Development Settings:**  
   - **Install:** na raiz do monorepo (depende da UI da Vercel): em muitos casos você define **Install Command** como:

     ```bash
     cd ../.. && npm ci
     ```

   - **Build command:**

     ```bash
     cd ../.. && npm run build --workspace=@lb-team/web
     ```

   Ajuste `cd` conforme a Vercel interpretar o diretório raiz do app (`apps/web` → dois níveis acima = monorepo root).

5. **Environment Variables:**

   | Nome | Valor |
   |------|--------|
   | `NEXT_PUBLIC_API_URL` | URL **HTTPS** da API no Render, **sem** barra no final, ex.: `https://lb-team-api.onrender.com` |

6. Deploy. Anote a URL: `https://….vercel.app`.

---

## 5. Fechar o ciclo (CORS)

Com o Blueprint, `FRONTEND_URL` já é **`https://lbteam.vercel.app`**. Se mudar o domínio do site no futuro, atualize no Render (ou no `render.yaml`) e redeploy.

Teste: abra [https://lbteam.vercel.app](https://lbteam.vercel.app), login com usuário demo (após seed), fluxos principais.

---

## Checklist rápido

- [ ] Neon com `DATABASE_URL`  
- [ ] Render: build/start da raiz; envs `DATABASE_URL`, `JWT_SECRET`, depois `FRONTEND_URL`  
- [ ] Migrate + seed no Neon  
- [ ] Vercel: `NEXT_PUBLIC_API_URL` = URL Render  
- [ ] `FRONTEND_URL` na API = URL Vercel  

---

## Limitações (free Render)

- **Cold start:** após inatividade, a primeira requisição pode demorar.  
- **Disco:** uploads de vídeo em `uploads/` são **efêmeros** em redeploy; para produção séria, use armazenamento de objetos (ex.: R2/S3) no futuro.

---

## URLs fixas deste projeto

- **Vercel:** `https://lbteam.vercel.app`  
- **Render → `FRONTEND_URL`:** já definido no `render.yaml`.  
- **Vercel → `NEXT_PUBLIC_API_URL`:** URL **https** da API no Render (ex.: `https://lb-team-api.onrender.com`) — defina após o primeiro deploy da API e **redeploy** o site ao mudar.
