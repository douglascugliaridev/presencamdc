# Mais de Cristo — Controle de Presença

Sistema de controle de presença da Igreja Mais de Cristo: o aluno marca presença pelo **celular** (app Expo, validado por geolocalização), e o **painel web** administrativo gerencia alunos, turmas, eventos, relatórios e bloqueios por faltas. Tudo servido por uma **API NestJS** com PostgreSQL/PostGIS.

## Arquitetura

```
┌──────────────┐      ┌──────────────────────────────┐     ┌─────────────────────┐
│   Mobile     │      │            API              │     │  Postgres + PostGIS │
│  (React      │─────►│   NestJS (REST, porta 3333) │────►│  Prisma            │
│   Native)    │  GPS │   JWT access + refresh      │     │  check-in por raio  │
│  Expo Go     │─────►│   Job de faltas (agendado)  │     │  audit_logs         │
└──────────────┘      │   Auditoria de ações admin  │     └─────────────────────┘
                      └──────────────────────────────┘
┌──────────────┐                 ▲
│   Painel     │─────(admin)─────┘
│   Web        │
│  (Next.js,   │
│   porta 3000)│
└──────────────┘
```

- **Mobile**: React Native + Expo (expo-location, expo-secure-store, safe-area-context) — porta 8081 (Metro)
- **Web**: Next.js 15 + Tailwind — porta 3000
- **API**: NestJS + Prisma + PostgreSQL/PostGIS + JWT — porta 3333

## Funcionalidades

- **App do aluno**: login e check-in geo-referenciado — só dentro do raio da igreja, com GPS com acurácia mínima; presença única por evento; contador de faltas com alertas.
- **Bloqueio automático por faltas**: job agendado (a cada hora + no boot da API) conta eventos passados sem presença e bloqueia quem atingiu `max_faltas`; desbloqueio admin com motivo (auditado).
- **Painel administrativo** (login exige role `admin`): dashboard resumido, CRUD de alunos/turmas/eventos, relatórios por aluno e por turma com gráficos e **exportação CSV**, lista de bloqueados, configurações de limite de faltas e da igreja (coordenadas + raio).
- **Segurança e UX**: JWT com refresh, helmet, throttling global, filtro global de exceções com **mensagens em português**, respostas de erro consistentes para web e mobile (via `@presencamdc/shared`).
- **Responsividade**: painel web mobile-first (sidebar vira drawer em telas pequenas); app mobile com safe area (notch) e suporte a escala de fonte do sistema.

## Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **API**: NestJS (REST) + Prisma + PostgreSQL/PostGIS + JWT (access + refresh)
- **Mobile**: React Native + Expo (expo-location/secure-store)
- **Web**: Next.js + TailwindCSS

## Estrutura

```
apps/
  api/       # Backend NestJS (porta 3333)
  mobile/    # App do aluno (Expo)
  web/       # Painel administrativo (Next.js, porta 3000)
packages/
  shared/    # Tipos, constantes e mensagens de erro compartilhadas
  tsconfig/  # Configs base de TypeScript
```

## Pré-requisitos

- Node.js >= 20
- pnpm >= 10
- Docker (para o banco local)

## Como rodar

```bash
# 1. Instalar dependências (não usar CI=true, ele força frozen-lockfile)
pnpm install

# 2. Subir o banco (Postgres + PostGIS) e rodar migrations + seed
pnpm db:up
pnpm db:migrate
pnpm db:seed

# 3. Subir API, web e mobile em dev
pnpm dev            # roda api e web (turbo)
cd apps/mobile && pnpm start   # mobile via Expo/Metro
```

Para abrir o app no celular/simulador: escaneie o QR code do Expo com o app **Expo Go** (SDK 52 — versão 2.32.x; SDKs mais novos do Expo Go são incompatíveis).

### Credenciais de teste (seed)

| Perfil | E-mail | Senha |
|---|---|---|
| Admin | admin@maisdecristo.com.br | admin123 |
| Aluno (presenças, hoje livre) | aluno@maisdecristo.com.br | admin123 |
| Aluno (sem presenças → bloqueado) | aluno2@maisdecristo.com.br | admin123 |

O seed cria 4 eventos "Culto" (últimos 3 dias + hoje). O **job de faltas** roda ao iniciar a API: o aluno `aluno2` recebe as faltas dos eventos passados e é **bloqueado automaticamente** ao atingir o limite (3). O `aluno` já tem presenças nos eventos passados e pode testar o check-in de hoje.

## Testes

- **API (45 testes, jest)**: services de autenticação, presença, faltas, admin e geo + filtro global de exceções e mapeamento de mensagens PT.
  ```bash
  pnpm test
  ```
- **Frontend (web/mobile)**: ainda **sem infraestrutura de testes** automatizados (planejado no Sprint 6). A lógica de mensagens de erro é a mesma do backend via `@presencamdc/shared`.

## Mensagens de erro e responsividade

- **Backend** fala português com o usuário: filtro global de exceções (`apps/api/src/common/filters/all-exceptions.filter.ts`) converte erros internos/Prisma/throttler em mensagens claras e loga o erro real no console sem vazá-lo.
- **`@presencamdc/shared`** centraliza `apiErrorMessage`/`statusFallbackMessage`/`CONNECTION_ERROR_MESSAGE` — web e mobile exibem exatamente o que o backend retorna, sem textos técnicos ("401", "Internal server error").
- **Painel web**: layout mobile-first — sidebar vira drawer com hambúrguer abaixo de 1024px; tabelas têm rolagem horizontal interna em telas estreitas.
- **App mobile**: safe area (não sobrepõe notch/status bar) e `maxFontSizeMultiplier` para funcionar com fonte grande do sistema.

## Comandos úteis

| Comando | Descrição |
|---|---|
| `pnpm build` | Build de todos os pacotes |
| `pnpm lint` / `pnpm typecheck` | Validação de tipos em todo o monorepo |
| `pnpm test` | Rodar testes (API) |
| `pnpm db:up` / `pnpm db:down` | Ligar/parar o banco via Docker |
| `pnpm --filter @presencamdc/api prisma:migrate` | Nova migration |
| `pnpm --filter @presencamdc/api prisma:seed` | Seed |

## Configuração de ambiente

Copie `.env.example` (na raiz) para `apps/api/.env` e preencha os valores. Variáveis sensíveis (JWT secrets, `DATABASE_URL`) **nunca devem ser commitadas** (`.env` está no `.gitignore`; apenas `.env.example` é versionado).

## Troubleshooting

- **`pnpm install` falha com frozen-lockfile**: rode sem `CI=true` (ou use `pnpm install --no-frozen-lockfile`).
- **Web com erro 500 após build**: `next build`/`turbo build` não devem rodar **enquanto o `next dev` estiver ativo** (corrompe `.next`). Para recuperar: derrube o dev, `rm -rf apps/web/.next`, reinicie o dev.
- **Expo não abre no simulador**: confira a versão do Expo Go (2.32.x = SDK 52) e se o Metro está em `:8081`.
- **"Muitas tentativas" ao testar**: rate limit global de 300 requisições/minuto por IP (web + app compartilham `127.0.0.1` em dev) — aguarde ~1 min.

## Padrões do projeto

- **Código**: identificadores em inglês (consistente com o schema)
- **Commits**: mensagens em português (`feat:`, `fix:`, `refactor:`...)
- **Regras de negócio**: sempre validadas no backend; frontends/mobile apenas refletem estado

## Deploy e publicação

Em andamento (Sprint 6). Pré-requisitos e caminho:

1. **Backend em produção** com **HTTPS + domínio** (ex.: Render/Railway/Fly ou VPS com Caddy/nginx): API Nest + Postgres, `prisma migrate deploy`, envs (`DATABASE_URL`, `JWT_*`, `WEB_ORIGIN`).
2. **App**: configurar `EXPO_PUBLIC_API_URL` para a API de produção (Android bloqueia HTTP claro), gerar ícones/adaptive icon quadrados, e publicar via **EAS Build** → `.aab` → Google Play (contas novas exigem closed testing de 14 dias com 20 testadores). App coleta localização → play console pede política de privacidade e formulário de dados.
3. **CI/CD** (typecheck + testes no push) a adicionar nesta fase.

## Sprints

- [x] **Sprint 1 — Fundação**: monorepo, schema + migrations, autenticação JWT
- [x] **Sprint 2 — Núcleo de presença**: check-in com validação de geolocalização (Haversine), tela de login + Home mobile com botão de presença, testes de geolocalização e presença única
- [x] **Sprint 3 — Turmas, eventos e relatórios**: CRUD admin (alunos, turmas, eventos), igreja/settings, relatórios por aluno e por turma com CSV e gráfico (painel web + API)
- [x] **Sprint 4 — Faltas, bloqueio e desbloqueio**: job agendado de faltas + bloqueio automático, endpoint de desbloqueio com motivo, tela de bloqueados no painel
- [x] **Sprint 5 — Segurança, identidade visual e polish**: auditoria de ações admin, helmet, favicon e identidade visual do painel, seed rico para demonstração, mensagens de erro PT, responsividade web/mobile
- [ ] Sprint 6 — Deploy (CI/CD, TestFlight/Play Console, Vercel)

## API — presença

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/attendance/check-in` | Marca presença (`{ latitude, longitude }`). Valida bloqueio, evento do dia, distância até a igreja e presença única |
| `GET` | `/me/status` | `{ absencesCount, maxAbsences, isBlocked }` |

O check-in é rejeitado com `403` quando o aluno está bloqueado ou fora do raio da igreja (Haversine), `404` sem evento agendado no dia e `409` em presença duplicada.

## API — painel administrativo

Todas as rotas exigem token de admin (`@Roles(ADMIN)`).

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/admin/summary` | Totais do dashboard (alunos, bloqueados, presenças de hoje) |
| `GET/POST` | `/admin/students` | Listar/criar aluno (`search`, `blocked`) |
| `PATCH` | `/admin/students/:id` | Editar aluno (nome, turma) |
| `PATCH` | `/admin/students/:id/unblock` | Desbloquear com `{ reason }`, registrado em auditoria |
| `GET/POST` | `/admin/classes` | Listar/criar turmas |
| `PATCH/DELETE` | `/admin/classes/:id` | Editar/excluir turma (exclusão bloqueada com alunos) |
| `GET/POST` | `/admin/events` | Listar (`classId`, `from`, `to`)/criar eventos |
| `DELETE` | `/admin/events/:id` | Excluir evento |
| `GET` | `/admin/reports/attendance/by-student` | Presenças/faltas por aluno (`start`, `end`, `classId`) |
| `GET` | `/admin/reports/attendance/by-class` | Taxa de presença por turma |
| `GET` | `/admin/reports/blocked-students` | Lista de alunos bloqueados |
| `GET/PATCH` | `/admin/church` | Consultar/atualizar igreja (coordenadas + raio) |
| `GET/PATCH` | `/admin/settings` | Configurações (ex.: `max_faltas`) |
| `GET` | `/admin/churches` | Listar igrejas |

O **job de faltas** (`@nestjs/schedule`, roda no boot e a cada hora) cria os registros de falta para eventos passados sem presença e bloqueia automaticamente alunos que atingiram `max_faltas`, contando apenas faltas posteriores ao último desbloqueio. Ações admin (CRUD, unblock, settings) são gravadas em `audit_logs`.