# Secretario

Asistente personal serverless integrado con IA que automatiza tareas repetitivas de baja criticalidad.

## 🏗️ Arquitectura

- **Runtime**: Cloudflare Workers + Workflows
- **Orquestación**: Cloudflare Workflows (durable multi-step execution)
- **IA**: DeepSeek API (bajo costo por token)
- **IaC**: Wrangler (configuración declarativa en `wrangler.jsonc`)
- **Lenguaje**: TypeScript

## 🚀 Estructura del Proyecto

```
secretario/
├── src/
│   ├── index.ts              # Worker entrypoint (fetch + scheduled handlers)
│   ├── operators/            # Unidades atómicas de trabajo reutilizables
│   │   ├── types.ts          # Contratos: Operator<TInput, TOutput>
│   │   ├── ai/               # Operadores de IA (summarize, etc.)
│   │   └── transform/        # Operadores de transformación
│   ├── integrations/         # Conectores a servicios externos
│   │   ├── gmail/            # Cliente Gmail API (OAuth2)
│   │   ├── telegram/         # Cliente Telegram Bot API
│   │   └── deepseek/         # Cliente DeepSeek API
│   ├── workflows/            # Composición de operators
│   │   ├── email-digest/     # Workflow: Gmail → DeepSeek → Telegram
│   │   └── registry.ts       # Registro de workflows disponibles
│   └── shared/               # Utilidades compartidas
└── wrangler.jsonc            # Infraestructura como código (Workers + Workflows)
```

## 📦 Instalación

```bash
bun install
```

## 🛠️ Desarrollo Local

```bash
# Ejecutar en modo dev (local)
bun run dev

# Formatear código
bun run format

# Lint
bun run lint

# Check + format + lint
bun run check

# Generar types de Workers
bun run types
```

## 🚢 Deploy

```bash
bun run deploy
```

## 🔐 Configuración de Secrets

### Gmail (OAuth2)

Ver [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) para guía completa.

```bash
# Obtener refresh token
bun run scripts/get-refresh-token.ts
```

### Telegram Bot

Ver [TELEGRAM_SETUP.md](./TELEGRAM_SETUP.md) para guía completa.

```bash
# Setup automatizado
bun run scripts/setup-telegram.ts
```

### DeepSeek AI (TODO)

```bash
# Agregar API key a .dev.vars
echo "DEEPSEEK_API_KEY=sk-..." >> .dev.vars
```

### Production Secrets

```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GOOGLE_REFRESH_TOKEN
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
wrangler secret put DEEPSEEK_API_KEY
```

## 📝 Workflows Disponibles

### Email Digest
Lee emails de Gmail, genera un resumen con IA, y lo envía a Telegram.

**Trigger**: 
- Cron: diario a las 8am
- Manual: comando `/digest` en Telegram

---

Built with ❤️ using [Cloudflare Workers](https://workers.cloudflare.com), [Bun](https://bun.sh), and [DeepSeek](https://deepseek.com)
