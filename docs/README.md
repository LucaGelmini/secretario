# Documentación - Secretario

## 📚 Guías de Configuración

- **[Deploy Guide](./DEPLOY.md)** - Guía completa de deployment a Cloudflare Workers
- **[Google OAuth Setup](./GOOGLE_OAUTH_SETUP.md)** - Configurar Gmail con OAuth2 para acceder a emails
- **[Telegram Setup](./TELEGRAM_SETUP.md)** - Crear y configurar un bot de Telegram

## 🏗️ Arquitectura

### Operators (Unidades de Trabajo)

Los operators son funciones puras y reutilizables con el tipo:
```typescript
type Operator<TInput, TOutput> = (input: TInput, context: OperatorContext) => Promise<TOutput>
```

**Operators disponibles:**
- `operators/email/fetch-emails` - Obtener emails de Gmail con filtros
- `operators/ai/summarize-emails` - Resumir emails con DeepSeek AI
- `operators/telegram/send-message` - Enviar mensaje a Telegram

### Integrations (Conectores a APIs)

Clientes para servicios externos:
- `integrations/gmail` - Gmail API (OAuth2)
- `integrations/telegram` - Telegram Bot API
- `integrations/deepseek` - DeepSeek AI (OpenAI-compatible)
- `integrations/google` - Google OAuth2 authentication

### Workflows (Orquestación)

Workflows que componen operators en flujos multi-step durables:
- `workflows/email-digest` - Gmail → DeepSeek → Telegram

## 🔧 Scripts de Setup

- `scripts/get-refresh-token.ts` - Obtener refresh token de Google OAuth2
- `scripts/setup-telegram.ts` - Configurar bot de Telegram interactivamente

## 🌐 Endpoints

### Worker Endpoints

- `GET /` o `/health` - Health check
- `GET /trigger` - Disparar workflow manualmente (testing)
- `POST /telegram/webhook` - Webhook para recibir comandos de Telegram

### Comandos de Telegram

- `/digest` - Ejecutar el workflow de email digest

## 📦 Estructura de Archivos

```
secretario/
├── src/
│   ├── index.ts                    # Worker entrypoint
│   ├── operators/                  # Unidades de trabajo reutilizables
│   │   ├── ai/                     # Operators de IA
│   │   ├── email/                  # Operators de email
│   │   └── telegram/               # Operators de Telegram
│   ├── integrations/               # Clientes de APIs externas
│   │   ├── gmail/                  # Gmail API
│   │   ├── telegram/               # Telegram Bot API
│   │   ├── deepseek/               # DeepSeek AI
│   │   └── google/                 # Google OAuth2
│   ├── workflows/                  # Workflows (orquestación)
│   │   └── email-digest/           # Email digest workflow
│   └── shared/                     # Utilidades compartidas
│       ├── env.ts                  # Tipos de environment
│       ├── errors.ts               # Errores personalizados
│       └── telegram-formatter.ts   # Conversor Markdown → HTML
├── scripts/                        # Scripts de setup
│   ├── get-refresh-token.ts        # OAuth2 refresh token
│   └── setup-telegram.ts           # Setup de Telegram bot
├── docs/                           # Documentación
└── wrangler.jsonc                  # Config de Cloudflare Workers
```

## 🔑 Variables de Entorno

Ver `.dev.vars.example` para todas las variables requeridas.

**Gmail OAuth2:**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`

**Telegram Bot:**
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

**DeepSeek AI:**
- `DEEPSEEK_API_KEY`
