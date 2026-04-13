# LB Team — Plataforma de treino feminino (constância + nutrição)

Monorepo com **Next.js 14** (frontend), **NestJS 10** (API), **PostgreSQL** e **Prisma 5**. O produto prioriza **progressão por frequência e consistência**, streak com janela configurável (padrão 24h), grupos com **sobrescrita individual** (treino e nutrição) e **RBAC** (aluna, personal, nutricionista, admin).

## Requisitos

- Node.js 20+
- **PostgreSQL 16+** em algum lugar acessível (máquina local ou nuvem)

**Docker não é obrigatório.** O `docker-compose.yml` é só um jeito rápido de subir o Postgres; você pode usar [Postgres.app](https://postgresapp.com/), Homebrew, instalador oficial ou um banco gerenciado (Neon, Supabase, etc.).

## Configuração rápida

O comando abaixo cria os `.env` a partir dos `.env.example` (se ainda não existirem), alinha com o `docker-compose.yml` e prepara o banco.

**Na primeira vez**, na **raiz** do repositório (`LB-Team/`), ou de dentro de `packages/database`, `apps/api` ou `apps/web`:

```bash
npm run setup:local
```

Com **Docker rodando**, o script sobe o Postgres (`docker compose up -d`), espera ficar pronto e roda `npm install`, `db:generate`, `db:migrate:deploy` e `db:seed`.

**Sem Docker:** instale o Postgres (veja abaixo), ajuste `DATABASE_URL` nos `.env` se não usar `lb`/`lb`/`lbteam` na porta `5432`, depois na raiz:

```bash
npm install && npm run db:generate && npm run db:migrate:deploy && npm run db:seed
```

### Postgres sem Docker (Mac)

1. **Postgres.app** — instale, inicie o servidor, abra “Open psql” e execute:
   ```sql
   CREATE USER lb WITH PASSWORD 'lb' CREATEDB;
   CREATE DATABASE lbteam OWNER lb;
   ```
2. **Homebrew** — `brew install postgresql@16`, `brew services start postgresql@16`, depois:
   ```bash
   psql postgres -c "CREATE ROLE lb WITH LOGIN PASSWORD 'lb';"
   psql postgres -c "CREATE DATABASE lbteam OWNER lb;"
   ```
   (Se `psql` não achar o servidor, use o caminho do brew, ex.: `/opt/homebrew/opt/postgresql@16/bin/psql`.)

3. **Nuvem (ex. Neon)** — crie um projeto gratuito, copie a connection string e coloque a mesma URL em `packages/database/.env` e `apps/api/.env` como `DATABASE_URL`.

Depois disso, no dia a dia: **`npm run dev:api`** e **`npm run dev:web`** (raiz do repo).

### Erro P1001 / “Can’t reach database server”

O Postgres precisa estar **de pé** antes do migrate.

1. **Docker Desktop** instalado → abra o app (ícone da baleia) e espere **Running**. Depois, na raiz: `docker compose up -d` e `npm run setup:local` de novo (ou só `npm run db:migrate:deploy && npm run db:seed`).
2. Se o script parar com *“daemon não está rodando”*, é exatamente isso: o Docker está instalado, mas o Desktop não foi aberto.
3. Sem Docker: use Postgres local na porta **5432** com usuário **lb**, senha **lb**, banco **lbteam** (como em `packages/database/.env`).

## Scripts

| Comando | Descrição |
|--------|-----------|
| `npm run setup:local` | Se Docker estiver ativo: sobe o Postgres e faz setup completo; sem Docker, use os comandos `npm run` acima após instalar o Postgres |
| `npm run db:generate` | `prisma generate` |
| `npm run db:migrate` | `prisma migrate dev` (no pacote database) |
| `npm run db:migrate:deploy` | `prisma migrate deploy` (CI / produção local) |
| `npm run db:push` | `prisma db push` (prototipagem) |
| `npm run db:seed` | Popula dados demo |
| `npm run db:remove-demo-students` | Remove só `aluna1@lbteam.app` … `aluna4` |
| `npm run db:remove-all-students` | Remove **todas** as alunas (`role: STUDENT`); mantém admin/personal/nutri |
| `npm run dev:api` | API em `http://localhost:4000` |
| `npm run dev:web` | Web em `http://localhost:3000` |

## Credenciais demo (após seed)

Senha comum: **`Senha123!`**

- `admin@lbteam.app` — ADMIN  
- `personal@lbteam.app` — TRAINER  
- `nutri@lbteam.app` — NUTRITIONIST  

Não há mais alunas fixas no seed. **Novas contas** (cadastro na landing) são ligadas a **`personal@lbteam.app`** e **`nutri@lbteam.app`** (ou aos e-mails em `DEFAULT_TRAINER_EMAIL` / `DEFAULT_NUTRITIONIST_EMAIL` no `apps/api/.env`, se definidos). A cada `db:seed`, personal e nutri têm **senha e perfil redefinidos** para os valores fixos acima.

O seed remove, se existirem, as contas demo antigas `aluna1@lbteam.app` … `aluna4@lbteam.app`.

## Arquitetura

```
apps/web          # Next.js App Router, Tailwind, tema laranja premium
apps/api          # NestJS: auth (JWT), módulos por domínio
packages/database # schema.prisma, migrations, seed
docs/API.md       # Referência de endpoints REST
```

### Domínios na API

- `auth` — registro (somente aluna pública), login, `/me`
- `onboarding` — questionário inicial
- `student` — dashboard, treino do dia, conclusão, check-in, disposição, nutrição
- `trainer` — dashboard, alunas, grupos, override individual, exercícios e templates (controllers dedicados)
- `nutritionist` — dashboard, pacientes, templates, grupos, override, observações
- `gamification` — streak, meta semanal, avanço de nível por constância, mensagens de engajamento
- `admin` — usuários, vínculos, settings

### Modelagem (resumo)

- **Herança + override**: `UserWorkoutOverride` / `UserNutritionOverride` sobrescrevem o plano vindo de `WorkoutGroup` / `NutritionGroup`.
- **Gamificação**: `UserLevel`, `LevelRule`, `WeeklyFrequencyLog`, `StreakState`, `EngagementMessage`, `DailyCheckin`.
- **Auditoria / evolução**: `ProgressHistory`, `ActivityLog`, `NutritionLog`, `AdminSetting`.

## Frontend — telas

- **Públicas**: landing, login, cadastro, recuperação de senha (placeholder).
- **Aluna**: onboarding, dashboard, treino do dia, execução, histórico, progresso, nutrição, check-in, mensagens de apoio, perfil.
- **Personal**: painel, alunas, detalhe, exercícios, modelos de treino, grupos, relatórios (orientação de evolução).
- **Nutricionista**: painel, pacientes, planos, grupos, relatórios.
- **Admin**: painel, usuários, vínculos, configurações.

Navegação responsiva com **bottom bar** no mobile e **AppShell** por papel.

## Próximos passos sugeridos (produção)

- Cookies httpOnly + CSRF ou BFF para token; hoje o demo usa `localStorage`.
- Migrar vídeos de exercício do Postgres/Neon para object storage (S3 / Azure Blob) e URLs assinadas conforme o volume crescer.
- Recuperação de senha com fila de e-mail.
- Testes e2e (Playwright) e contrato OpenAPI gerado a partir de DTOs Nest.

## Licença

Uso interno / projeto LB Team — ajuste conforme sua organização.
