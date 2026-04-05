# API LB Team (NestJS)

Base URL: `http://localhost:4000` (configurável via `API_PORT`).

## Autenticação

- `POST /auth/register` — cria **usuária STUDENT** (público).
- `POST /auth/login` — retorna `accessToken` JWT.
- `GET /auth/me` — Bearer obrigatório.

## Papéis (RBAC)

Headers: `Authorization: Bearer <token>`

| Prefixo | Papéis |
|---------|--------|
| `/student/*` | STUDENT |
| `/trainer/*`, `/trainer/workout-templates`, `/trainer/exercises` | TRAINER, ADMIN |
| `/nutritionist/*` | NUTRITIONIST, ADMIN |
| `/admin/*` | ADMIN |

## Endpoints principais

### Aluna

- `GET /student/dashboard` — streak, nível, meta semanal, mensagem de engajamento.
- `GET /student/workout-today` — template efetivo (override → grupo).
- `POST /student/workout-complete` — conclui treino; atualiza streak e frequência semanal.
- `POST /student/checkin` — check-in diário (enum `DispositionToday`).
- `POST /student/disposition-today` — “como estou hoje” + sugestão de adaptação.
- `POST /student/nutrition/open` — registra engajamento nutricional (streak).
- `GET /student/nutrition-plan` — plano efetivo (override → grupo).
- `GET /student/history/workouts`

### Onboarding

- `POST /onboarding` — STUDENT; persiste `StudentProfile`, limitações e respostas.

### Personal

- `GET /trainer/dashboard`
- `GET /trainer/students`, `GET /trainer/students/:id`
- `POST /trainer/workout-groups`, `POST /trainer/workout-groups/:groupId/members`
- `POST /trainer/students/:id/workout-override`
- `GET|POST|PATCH|DELETE /trainer/exercises`
- `GET|POST|PATCH|DELETE /trainer/workout-templates`

### Nutricionista

- `GET /nutritionist/dashboard`
- `GET /nutritionist/patients`
- `POST /nutritionist/templates`
- `POST /nutritionist/groups`, `POST /nutritionist/groups/:groupId/members`
- `POST /nutritionist/patients/:id/override`
- `POST /nutritionist/patients/:id/notes`

### Admin

- `GET /admin/users`
- `POST /admin/links/trainer-student`, `POST /admin/links/nutritionist-student`
- `PATCH /admin/settings/:key` — JSON `{ "value": ... }` (ex.: `streak_window_hours`)
