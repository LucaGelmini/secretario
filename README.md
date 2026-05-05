# Secretario

<p align="center">
  <img src="alfred.png" alt="Secretario" width="300">
</p>

<p align="center">
  <em>Asistente personal serverless integrado con IA que automatiza tareas repetitivas de baja criticalidad.</em>
</p>

## 🏗️ Arquitectura

- **Runtime**: Cloudflare Workers + Workflows
- **Orquestación**: Cloudflare Workflows (durable multi-step execution)
- **IA**: DeepSeek API (bajo costo por token)
- **IaC**: Wrangler (configuración declarativa en `wrangler.jsonc`)
- **Lenguaje**: TypeScript

## 🚀 Quick Start

```bash
# Instalar dependencias
bun install

# Configurar Gmail OAuth2
bun run scripts/get-refresh-token.ts

# Configurar Telegram Bot
bun run scripts/setup-telegram.ts

# Obtener API key de DeepSeek en https://platform.deepseek.com
echo "DEEPSEEK_API_KEY=sk-..." >> .dev.vars

# Desarrollo local
bun run dev

# Deploy a producción
bun run deploy
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

Ver [docs/DEPLOY.md](./docs/DEPLOY.md) para guía completa de deployment.

```bash
bun run deploy
```

## 🔐 Configuración

### Gmail (OAuth2)

Ver [docs/GOOGLE_OAUTH_SETUP.md](./docs/GOOGLE_OAUTH_SETUP.md) para guía completa.

```bash
bun run scripts/get-refresh-token.ts
```

### Telegram Bot

Ver [docs/TELEGRAM_SETUP.md](./docs/TELEGRAM_SETUP.md) para guía completa.

```bash
bun run scripts/setup-telegram.ts
```

### DeepSeek AI

1. Registrate en https://platform.deepseek.com/
2. Crea una API key
3. Agregala a `.dev.vars`:
   ```bash
   echo "DEEPSEEK_API_KEY=sk-..." >> .dev.vars
   ```

### Secrets en Producción

```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put GOOGLE_REFRESH_TOKEN
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
wrangler secret put DEEPSEEK_API_KEY
```

## 📝 Workflows Disponibles

### Email Digest + Cleanup
Workflow diario automático que:
- 📥 Fetch de emails de las últimas 24 horas
- 🏷️ Clasificación automática con reglas determinísticas + IA
- 🗂️ Organización: labels y limpieza (batch operations)
- 🤖 Resumen con IA (DeepSeek) de emails importantes
- 📊 Estadísticas de clasificación
- 💡 Sugerencias de nuevas reglas para confirmar

**Trigger**: 
- **Automático**: Todos los días a las 8:30 AM (Argentina)
- **Manual**: Comando `/digest` en Telegram o `GET /trigger`

**Seguridad**:
- 🔐 Bot de Telegram solo responde a tu chat ID
- 🛡️ Protección contra prompt injection
- ✅ Reglas aprendidas requieren confirmación explícita

## 📚 Documentación

- **[docs/](./docs/)** - Documentación completa
- **[docs/DEPLOY.md](./docs/DEPLOY.md)** - Guía de deployment
- **[docs/GOOGLE_OAUTH_SETUP.md](./docs/GOOGLE_OAUTH_SETUP.md)** - Configurar Gmail
- **[docs/TELEGRAM_SETUP.md](./docs/TELEGRAM_SETUP.md)** - Configurar Telegram

## 🏗️ Arquitectura

- **Operators**: Unidades de trabajo reutilizables (`Operator<TInput, TOutput>`)
- **Integrations**: Clientes de APIs (Gmail, Telegram, DeepSeek)
- **Workflows**: Orquestación multi-step durable con Cloudflare Workflows

Ver [docs/README.md](./docs/README.md) para más detalles.

---

Built with [Cloudflare Workers](https://workers.cloudflare.com), [Bun](https://bun.sh), and [DeepSeek](https://deepseek.com)
