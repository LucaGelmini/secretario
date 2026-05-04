# Configuración de Google Service Account para Gmail API

Esta guía te muestra cómo configurar una Google Service Account con domain-wide delegation para acceder a Gmail desde Secretario.

## 📋 Requisitos Previos

- Una cuenta de **Google Workspace** (no funciona con Gmail personal gratuito)
- Permisos de **Super Admin** en Google Workspace

---

## 🚀 Paso 1: Crear un Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto:
   - Click en el selector de proyectos (arriba a la izquierda)
   - Click en **"New Project"**
   - Nombre: `secretario` (o el que prefieras)
   - Click **"Create"**
3. Selecciona el proyecto recién creado

---

## 🔧 Paso 2: Habilitar Gmail API

1. En el proyecto, ve a **"APIs & Services"** > **"Library"**
2. Busca **"Gmail API"**
3. Click en **"Gmail API"**
4. Click **"Enable"**

---

## 🔑 Paso 3: Crear una Service Account

1. Ve a **"IAM & Admin"** > **"Service Accounts"**
2. Click **"Create Service Account"**
3. Rellena los datos:
   - **Service account name**: `secretario-gmail-reader`
   - **Service account ID**: se auto-genera (ej: `secretario-gmail-reader@proyecto.iam.gserviceaccount.com`)
   - **Description**: "Service account para leer emails en Secretario"
4. Click **"Create and Continue"**
5. **Skip** la sección "Grant this service account access to project" (no es necesario)
6. **Skip** la sección "Grant users access to this service account"
7. Click **"Done"**

---

## 📄 Paso 4: Generar una Clave JSON

1. En la lista de Service Accounts, click en la que acabás de crear
2. Ve a la tab **"Keys"**
3. Click **"Add Key"** > **"Create new key"**
4. Selecciona **JSON**
5. Click **"Create"**
6. Se descargará un archivo JSON (ej: `secretario-gmail-reader-abc123.json`)

**⚠️ IMPORTANTE**: Guardá este archivo en un lugar seguro. No lo commitees a git.

---

## 🌐 Paso 5: Habilitar Domain-Wide Delegation

1. En la página de la Service Account, copia el **"Unique ID"** (es un número largo, ej: `123456789012345678901`)
   - También podés encontrarlo en el JSON descargado como `client_id`
2. Ve al [Google Admin Console](https://admin.google.com)
3. Navega a **Security** > **Access and data control** > **API Controls**
4. En la sección **"Domain-wide Delegation"**, click **"Manage Domain Wide Delegation"**
5. Click **"Add new"**
6. Rellena:
   - **Client ID**: pega el Unique ID que copiaste
   - **OAuth Scopes**: `https://www.googleapis.com/auth/gmail.readonly`
   - Click **"Authorize"**

---

## 🔐 Paso 6: Configurar los Secrets en Cloudflare Workers

Ahora necesitás agregar las credenciales como secrets en Cloudflare.

### A) Para desarrollo local (`.dev.vars`):

1. Copia `.dev.vars.example` a `.dev.vars`:
   ```bash
   cp .dev.vars.example .dev.vars
   ```

2. Edita `.dev.vars` y rellena con los valores del JSON:

   ```bash
   # Abrí el JSON descargado y extraé estos valores:
   GOOGLE_SERVICE_ACCOUNT_EMAIL=secretario-gmail-reader@proyecto.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...tu-clave-completa...==\n-----END PRIVATE KEY-----\n"
   GOOGLE_IMPERSONATE_EMAIL=tu-email@tudominio.com
   ```

   **Nota sobre `GOOGLE_PRIVATE_KEY`**:
   - Debe incluir los headers `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`
   - Los saltos de línea deben ser literales `\n` (como en el JSON)
   - Debe estar entre comillas dobles

### B) Para producción (Cloudflare Workers secrets):

```bash
# Service Account Email
wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
# Pega: secretario-gmail-reader@proyecto.iam.gserviceaccount.com

# Private Key (copia todo el bloque del JSON, incluyendo \n)
wrangler secret put GOOGLE_PRIVATE_KEY
# Pega todo el "private_key" del JSON (con los \n literales)

# Email a impersonar (tu email de Google Workspace)
wrangler secret put GOOGLE_IMPERSONATE_EMAIL
# Pega: tu-email@tudominio.com
```

---

## ✅ Paso 7: Verificar la Configuración

Una vez configurados los secrets, podés probar:

### Localmente:
```bash
bun run dev
# En otra terminal:
curl http://localhost:8787/trigger
```

### En producción:
```bash
bun run deploy
curl https://secretario.<tu-subdomain>.workers.dev/trigger
```

Deberías ver en los logs los subjects de tus emails recientes.

---

## 🐛 Troubleshooting

### Error: "Unauthorized"
- Verificá que el `client_id` en Domain-Wide Delegation sea correcto
- Verificá que el scope sea exactamente `https://www.googleapis.com/auth/gmail.readonly`
- Esperá unos minutos después de configurar Domain-Wide Delegation (puede tardar en propagarse)

### Error: "Invalid JWT"
- Verificá que `GOOGLE_PRIVATE_KEY` incluya los headers (`-----BEGIN/END PRIVATE KEY-----`)
- Verificá que los `\n` estén presentes (son literales, no saltos de línea reales en el secret)

### Error: "User does not exist"
- Verificá que `GOOGLE_IMPERSONATE_EMAIL` sea un usuario válido de tu Google Workspace
- El email debe pertenecer al mismo dominio donde configuraste Domain-Wide Delegation

### No se encuentran emails
- Verificá que el email tenga mensajes en las últimas 24 horas
- Probá cambiar el parámetro `hoursBack` en el workflow (edita `src/index.ts`)

---

## 📚 Referencias

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [Domain-Wide Delegation](https://developers.google.com/identity/protocols/oauth2/service-account#delegatingauthority)
