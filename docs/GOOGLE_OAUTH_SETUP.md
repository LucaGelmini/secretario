# Configuración de Gmail con OAuth2 (Cuentas Personales)

Esta guía te muestra cómo configurar OAuth2 para acceder a Gmail desde Secretario usando una cuenta Gmail personal (no requiere Google Workspace).

## 🎯 Objetivo

Obtener un **refresh token** que Secretario usará para acceder a tus emails automáticamente. Solo tenés que hacer esto **UNA VEZ**, el refresh token nunca expira.

---

## 📋 Paso 1: Habilitar Gmail API en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto (o usa uno existente):
   - Click en el selector de proyectos (arriba a la izquierda)
   - Click en **"New Project"**
   - Nombre: `secretario` (o el que prefieras)
   - Click **"Create"**
3. Selecciona el proyecto
4. Ve a **"APIs & Services"** > **"Library"**
5. Busca **"Gmail API"**
6. Click en **"Gmail API"** y luego **"Enable"**

---

## 🔑 Paso 2: Crear credenciales OAuth2

1. Ve a **"APIs & Services"** > **"Credentials"**
2. Click **"Create Credentials"** > **"OAuth client ID"**
3. Si es la primera vez, te pedirá configurar la "OAuth consent screen":
   - Click **"Configure Consent Screen"**
   - User Type: **External** (para cuentas personales)
   - Click **"Create"**
   - App name: `Secretario`
   - User support email: tu email
   - Developer contact: tu email
   - Click **"Save and Continue"**
   - En "Scopes", click **"Add or Remove Scopes"**
   - Busca y selecciona: `https://www.googleapis.com/auth/gmail.readonly`
   - Click **"Update"** y luego **"Save and Continue"**
   - En "Test users", click **"Add Users"**
   - Agrega tu email
   - Click **"Save and Continue"**
4. Volvé a **"Credentials"** > **"Create Credentials"** > **"OAuth client ID"**
5. Application type: **"Desktop app"**
6. Name: `Secretario Gmail Access`
7. Click **"Create"**
8. **Guardá el Client ID y Client Secret** (los vas a necesitar en el siguiente paso)

---

## 🚀 Paso 3: Ejecutar el script de setup

Ahora vas a ejecutar un script que:
1. Te pide el Client ID y Client Secret
2. Genera una URL de autorización
3. Vos te logueas con tu cuenta Gmail
4. Te da un código de autorización
5. El script intercambia ese código por un refresh token

**Ejecutá el script:**

```bash
bun run scripts/setup-gmail-oauth.ts
```

**El script te va a pedir:**

1. **Client ID**: pegá el que copiaste en el paso anterior
2. **Client Secret**: pegá el que copiaste en el paso anterior
3. **Authorization URL**: el script la genera, copiala y abrila en tu navegador
4. **Logueate** con tu cuenta Gmail
5. Click **"Allow"** (te va a decir que la app no está verificada, click en "Advanced" > "Go to Secretario (unsafe)" - esto es normal)
6. **Copiá el código** que te muestra Google
7. **Pegá el código** en el script

**Si todo sale bien, el script te mostrará:**

```
✅ Success! Here are your credentials:

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
```

---

## 🔐 Paso 4: Configurar los secrets

### Para desarrollo local:

1. Copia `.dev.vars.example` a `.dev.vars`:
   ```bash
   cp .dev.vars.example .dev.vars
   ```

2. Edita `.dev.vars` y pega los valores que te dio el script:
   ```bash
   GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=tu-client-secret
   GOOGLE_REFRESH_TOKEN=tu-refresh-token
   ```

### Para producción (Cloudflare Workers):

```bash
wrangler secret put GOOGLE_CLIENT_ID
# Pega el Client ID cuando te lo pida

wrangler secret put GOOGLE_CLIENT_SECRET
# Pega el Client Secret

wrangler secret put GOOGLE_REFRESH_TOKEN
# Pega el Refresh Token
```

---

## ✅ Paso 5: Verificar que funciona

### Localmente:

```bash
bun run dev
# En otra terminal:
curl http://localhost:8787/trigger
```

Deberías ver en los logs:
- "Getting Google access token from refresh token..."
- "Fetching emails from the last 24 hours..."
- Los subjects de tus emails recientes

### En producción:

```bash
bun run deploy
curl https://secretario.<tu-subdomain>.workers.dev/trigger
```

Luego andá al [Dashboard de Cloudflare](https://dash.cloudflare.com/) > Workers & Pages > secretario > Logs para ver los resultados.

---

## 🐛 Troubleshooting

### Error: "No refresh token received"

Esto pasa si ya autorizaste la app antes. Solución:

1. Ve a https://myaccount.google.com/permissions
2. Busca "Secretario Gmail Access"
3. Click en **"Remove Access"**
4. Volvé a ejecutar el script de setup

### Error: "Invalid grant"

El refresh token puede haber expirado o sido revocado. Solución:

1. Revocá el acceso en https://myaccount.google.com/permissions
2. Volvé a ejecutar el script de setup

### Error: "Access blocked: This app's request is invalid"

Verificá que:
- Habilitaste la Gmail API en el proyecto correcto
- Agregaste tu email como "test user" en la OAuth consent screen
- El scope `https://www.googleapis.com/auth/gmail.readonly` está configurado

---

## 🔒 Seguridad

- **El refresh token nunca expira** a menos que:
  - Lo revokes manualmente
  - Cambies tu contraseña de Google
  - Han pasado 6 meses sin usarlo (solo si la app no está "Published")
- **No compartas** el refresh token con nadie
- **No lo commitees** a git (`.dev.vars` está en `.gitignore`)

---

## 📚 Referencias

- [OAuth 2.0 for Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Gmail API Scopes](https://developers.google.com/gmail/api/auth/scopes)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
