# 🔐 Guía de Seguridad - Configuración de Credenciales

## Variables de Entorno Requeridas

### 1. Base de Datos (Supabase PostgreSQL)
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.example.supabase.co:5432/postgres"
```
- **Dónde obtenerla**: Supabase Dashboard → Settings → Database → Connection String
- **Importante**: Nunca compartas esta URL, contiene tu contraseña

### 2. API de Hawaii (Mallas Curriculares UCN)
```env
HAWAII_API_URL=https://losvilos.ucn.cl/hawaii/api
HAWAII_AUTH_TOKEN=tu_token_aqui
```
- **Token actual**: Está configurado en tu `.env`
- **Uso**: Autenticación para obtener mallas curriculares
- **Header requerido**: `X-HAWAII-AUTH: [token]`

### 3. API de Puclaro (Avance Académico y Login UCN)
```env
PUCLARO_API_URL=https://puclaro.ucn.cl/eross/avance
```
- **Uso**: Login de estudiantes y obtención de avance académico
- **Autenticación**: Usa credenciales institucionales (email/password)

## 📋 Checklist de Seguridad

### ✅ Configuración Inicial
- [x] `.env` está en `.gitignore`
- [x] `.env.example` está documentado (sin valores sensibles)
- [x] Variables de entorno validadas al inicio del servidor
- [x] Tokens hardcodeados removidos del código

### ✅ Buenas Prácticas Implementadas
- [x] Todas las URLs de APIs externas configurables via `.env`
- [x] Tokens de autenticación en variables de entorno
- [x] Validación de variables requeridas al iniciar servidor
- [x] Mensajes de error claros si faltan variables

### 🔄 Para Implementar en Producción

#### 1. Rotar Token de Hawaii API (si es necesario)
```bash
# Contactar al administrador de la API Hawaii para obtener un token de producción
# Actualizar en tu .env de producción
HAWAII_AUTH_TOKEN=nuevo_token_produccion
```

#### 2. Variables de Entorno en Vercel/Render/AWS
```bash
# En el panel de tu proveedor de hosting:
DATABASE_URL=tu_connection_string
HAWAII_API_URL=https://losvilos.ucn.cl/hawaii/api
HAWAII_AUTH_TOKEN=tu_token
PUCLARO_API_URL=https://puclaro.ucn.cl/eross/avance
NODE_ENV=production
```

#### 3. Habilitar HTTPS en Producción
- Todas las APIs externas ya usan HTTPS ✅
- Tu backend debe estar detrás de HTTPS (Vercel/Render lo hace automáticamente)

## 🚨 Qué NO hacer

❌ **NUNCA hagas esto:**
1. Subir `.env` a Git
2. Hardcodear tokens en el código
3. Compartir tu `DATABASE_URL` públicamente
4. Exponer tokens en logs de producción
5. Usar el mismo `.env` para desarrollo y producción

## 🔍 Verificar Configuración

```bash
# En tu servidor backend, al iniciar deberías ver:
✅ Variables de entorno cargadas correctamente
🚀 Servidor escuchando en puerto 3001
```

Si ves:
```bash
❌ ERROR: Faltan las siguientes variables de entorno requeridas:
   - DATABASE_URL
```

**Solución**: Copia `.env.example` a `.env` y configura los valores correctos.

## 📞 Contactos para Credenciales

### API Hawaii (Mallas)
- **Responsable**: Departamento de Informática UCN
- **Token actual**: Configurado en `.env`

### API Puclaro (Avance/Login)
- **Uso**: Credenciales institucionales de estudiantes
- **No requiere token especial**: Usa email/password de UCN

### Supabase (Base de Datos)
- **Dashboard**: https://supabase.com
- **Proyecto**: Cursoreo
- **Connection String**: Settings → Database

## 🔄 Rotación de Credenciales

### Frecuencia Recomendada
- **DATABASE_URL**: Cambiar si hay sospecha de compromiso
- **HAWAII_AUTH_TOKEN**: Según política del departamento de TI UCN
- **JWT_SECRET** (futuro): Cada 6-12 meses en producción

### Proceso de Rotación
1. Generar nueva credencial en el servicio
2. Actualizar `.env` local y en servidor de producción
3. Reiniciar servidor
4. Verificar que todo funcione
5. Invalidar credencial antigua

## 📝 Logs y Monitoreo

### Qué logear
✅ Intentos de login (sin passwords)
✅ Llamadas a APIs externas (sin tokens en logs)
✅ Errores de autenticación

### Qué NO logear
❌ Passwords de usuarios
❌ Tokens de API completos
❌ Connection strings completos

---

**Última actualización**: Noviembre 2025
**Responsable**: Equipo Cursoreo
