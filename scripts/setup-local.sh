#!/usr/bin/env bash
# Uma vez: sobe Postgres (Docker), aplica migrações e seed. Depois use só dev:api e dev:web.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f packages/database/.env ]; then
  cp packages/database/.env.example packages/database/.env
  echo ">>> Criado packages/database/.env"
fi
if [ ! -f apps/api/.env ]; then
  cp apps/api/.env.example apps/api/.env
  echo ">>> Criado apps/api/.env"
fi
if [ ! -f apps/web/.env.local ]; then
  cp apps/web/.env.example apps/web/.env.local
  echo ">>> Criado apps/web/.env.local"
fi

if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    echo ">>> Subindo PostgreSQL (docker compose)..."
    docker compose up -d
    echo ">>> Aguardando Postgres ficar pronto..."
    for _ in $(seq 1 45); do
      if docker compose exec -T postgres pg_isready -U lb -d lbteam >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done
  else
    echo ""
    echo ">>> ATENÇÃO: o comando \`docker\` existe, mas o daemon não está rodando."
    echo "    Abra o **Docker Desktop** (ícone da baleia na barra), espere ficar \"Running\","
    echo "    e rode de novo:  npm run setup:local"
    echo ""
    exit 1
  fi
else
  echo ">>> Docker não encontrado — não é obrigatório."
  echo "    Instale o Postgres (Postgres.app, Homebrew ou Neon) e crie usuário/db conforme README."
  echo "    Depois na raiz:  npm install && npm run db:generate && npm run db:migrate:deploy && npm run db:seed"
  echo ""
fi

npm install
npm run db:generate

if ! npm run db:migrate:deploy; then
  echo ""
  echo ">>> Não foi possível conectar ao Postgres (erro comum: P1001)."
  echo ""
  echo "    Com Docker Desktop:"
  echo "      1) Abra o Docker Desktop até aparecer \"running\""
  echo "      2) Na raiz do projeto:  docker compose up -d"
  echo "      3) Depois:  npm run db:migrate:deploy && npm run db:seed"
  echo ""
  echo "    Sem Docker: Postgres 16 em localhost:5432, usuário lb, senha lb, banco lbteam"
  echo "      (valores em packages/database/.env — ajuste se usar outra porta.)"
  echo ""
  exit 1
fi

npm run db:seed

echo ""
echo ">>> Pronto. Agora em terminais separados na raiz do repo:"
echo "    npm run dev:api"
echo "    npm run dev:web"
