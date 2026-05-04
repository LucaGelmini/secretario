# Guía de Deploy - Secretario

## 🚀 Paso 1: Autenticación en Cloudflare

Si es la primera vez que usás Wrangler, necesitás autenticarte:

```bash
bun run wrangler login
```

Esto abrirá tu navegador para que autorices el acceso a tu cuenta de Cloudflare.

## 📦 Paso 2: Deploy del Worker

```bash
bun run deploy
```

Este comando:
- Compila el código TypeScript
- Sube el Worker a Cloudflare
- Registra el Workflow `EmailDigestWorkflow`
- Crea los bindings definidos en `wrangler.jsonc`

## ✅ Paso 3: Verificar el Deploy

Una vez deployado, Wrangler te mostrará la URL de tu Worker:

```
https://secretario.<tu-subdomain>.workers.dev
```

### Endpoints disponibles:

1. **Health Check**:
   ```bash
   curl https://secretario.<tu-subdomain>.workers.dev/health
   ```
   
   Debería retornar:
   ```json
   {
     "status": "ok",
     "service": "secretario",
     "version": "0.1.0",
     "timestamp": "2026-05-04T..."
   }
   ```

2. **Trigger Manual del Workflow**:
   ```bash
   curl https://secretario.<tu-subdomain>.workers.dev/trigger
   ```
   
   Debería retornar:
   ```json
   {
     "success": true,
     "message": "Workflow triggered successfully",
     "instanceId": "...",
     "status": { ... }
   }
   ```

## 📊 Paso 4: Monitorear el Workflow

Podés ver el estado del workflow de varias formas:

### A) Desde el Dashboard de Cloudflare:
1. Ir a https://dash.cloudflare.com
2. Workers & Pages → secretario
3. Workflows → email-digest-workflow
4. Ver instancias y logs

### B) Desde la línea de comandos:
```bash
# Ver logs en tiempo real
bun run wrangler tail

# Ver workflows
bun run wrangler workflows list
```

## 🔐 Gestión de Secrets (para pasos futuros)

Cuando agregues las integraciones (Gmail, Telegram, DeepSeek), necesitarás configurar secrets:

```bash
# Google Service Account
wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
wrangler secret put GOOGLE_PRIVATE_KEY
wrangler secret put GOOGLE_IMPERSONATE_EMAIL

# Telegram
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID

# DeepSeek
wrangler secret put DEEPSEEK_API_KEY
```

Los secrets se almacenan encriptados en Cloudflare y solo están disponibles en runtime.

## 🔄 Re-deploys

Cada vez que hagas cambios al código, simplemente ejecutá:

```bash
bun run deploy
```

Wrangler automáticamente:
- Versionará el deploy
- Actualizará el Worker
- Mantendrá los secrets existentes

## 🧹 Rollback (si algo sale mal)

```bash
# Ver versiones anteriores
wrangler deployments list

# Hacer rollback a una versión específica
wrangler rollback --message "Rollback to previous version"
```

## 🌍 Entornos (Dev vs Prod)

Por ahora tenemos un solo entorno. Si más adelante querés separar dev/staging/prod, podés:

1. Crear múltiples `wrangler.jsonc` (ej: `wrangler.prod.jsonc`)
2. Usar variables de entorno: `wrangler deploy --env production`

---

**Próximo paso**: Una vez verificado que el workflow dummy funciona, continuamos con la integración de Gmail (Paso 2).
