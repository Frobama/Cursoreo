# ✅ **CHECKLIST BACKEND - Sistema Admin/Profesores**

**Proyecto:** Cursoreo - UCN  
**Fecha de creación:** 6 de Diciembre, 2025  
**Responsable:** Equipo Backend

---

## **📊 1. Base de Datos**

### Tareas:
- [ ] Agregar modelo `Profesor` en `prisma/schema.prisma` con los siguientes campos:
  - `id` → String, @id, @default(cuid())
  - `rut` → String, @unique
  - `nombre` → String
  - `email` → String, @unique
  - `password` → String (hasheado con bcrypt)
  - `departamento` → String? (opcional)
  - `activo` → Boolean, @default(true)
  - `createdAt` → DateTime, @default(now())
  - `updatedAt` → DateTime, @updatedAt
  - `ultimoAcceso` → DateTime? (opcional)

- [ ] Ejecutar migración: `npx prisma migrate dev --name add_profesores_table`
- [ ] Generar cliente Prisma: `npx prisma generate`
- [ ] Verificar que la tabla `Profesor` se creó correctamente en PostgreSQL

### Ejemplo de modelo Prisma:
```prisma
model Profesor {
  id            String    @id @default(cuid())
  rut           String    @unique
  nombre        String
  email         String    @unique
  password      String
  departamento  String?
  activo        Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  ultimoAcceso  DateTime?
}
```

---

## **🌱 2. Seed de Datos**

### Tareas:
- [ ] Crear o actualizar archivo `prisma/seed.ts`
- [ ] Instalar bcrypt si no está: `npm install bcrypt @types/bcrypt`
- [ ] Importar bcrypt: `import bcrypt from 'bcrypt'`
- [ ] Crear función `createProfesor()` con los siguientes datos:
  - Email: `admin@ucn.cl`
  - Password: `admin123` (debe ser hasheado con bcrypt.hash())
  - Nombre: `Dr. Juan Pérez`
  - RUT: `12345678-9`
  - Departamento: `Ingeniería de Sistemas`
  - Activo: `true`

- [ ] Agregar script en `package.json`:
  ```json
  "scripts": {
    "seed": "ts-node prisma/seed.ts"
  }
  ```

- [ ] Ejecutar seed: `npm run seed`
- [ ] Verificar en la base de datos que el profesor se insertó correctamente
- [ ] Probar login con las credenciales de prueba

### Ejemplo de seed:
```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const profesor = await prisma.profesor.upsert({
    where: { email: 'admin@ucn.cl' },
    update: {},
    create: {
      rut: '12345678-9',
      nombre: 'Dr. Juan Pérez',
      email: 'admin@ucn.cl',
      password: hashedPassword,
      departamento: 'Ingeniería de Sistemas',
      activo: true
    }
  });

  console.log('✅ Profesor creado:', profesor);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## **🔐 3. Autenticación**

### Crear endpoint de login:

#### Tareas estructura:
- [ ] Crear carpeta `src/routes/admin/` si no existe
- [ ] Crear archivo `src/routes/admin/auth.routes.ts`
- [ ] Crear controlador `src/controllers/admin/auth.controller.ts`

#### Tareas endpoint `POST /api/admin/login`:

**Validaciones:**
- [ ] Validar que `email` y `password` estén presentes en el body
- [ ] Validar formato de email (debe ser válido)
- [ ] Retornar 400 si faltan campos:
  ```json
  { "error": "Email y password son requeridos" }
  ```

**Lógica de autenticación:**
- [ ] Buscar profesor por email: `prisma.profesor.findUnique({ where: { email } })`
- [ ] Retornar 404 si no existe:
  ```json
  { "error": "Profesor no encontrado" }
  ```

- [ ] Verificar que `activo === true`
- [ ] Retornar 403 si está inactivo:
  ```json
  { "error": "Cuenta deshabilitada. Contacte al administrador" }
  ```

- [ ] Comparar password: `await bcrypt.compare(password, profesor.password)`
- [ ] Retornar 401 si password es incorrecto:
  ```json
  { "error": "Credenciales inválidas" }
  ```

**Si autenticación exitosa:**
- [ ] Actualizar campo `ultimoAcceso`: 
  ```typescript
  await prisma.profesor.update({
    where: { id: profesor.id },
    data: { ultimoAcceso: new Date() }
  });
  ```

- [ ] Generar token JWT con el siguiente payload:
  ```typescript
  {
    rut: profesor.rut,
    email: profesor.email,
    nombre: profesor.nombre,
    rol: 'PROFESOR'
  }
  ```

- [ ] Retornar respuesta 200:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "profesor": {
      "rut": "12345678-9",
      "nombre": "Dr. Juan Pérez",
      "email": "admin@ucn.cl",
      "departamento": "Ingeniería de Sistemas",
      "rol": "PROFESOR"
    }
  }
  ```

**Integración:**
- [ ] Registrar ruta en `src/index.ts` o `src/app.ts`:
  ```typescript
  app.use('/api/admin', adminAuthRoutes);
  ```

---

## **🛡️ 4. Autorización (Middleware)**

### Crear middleware de verificación de profesor:

#### Tareas:
- [ ] Crear archivo `src/middleware/verificarProfesor.ts`
- [ ] Importar middleware existente `verificarToken` (debe estar en `src/middleware/verificarToken.ts`)
- [ ] Implementar función middleware con la siguiente lógica:
  - [ ] Verificar que `req.user` existe (viene del middleware `verificarToken`)
  - [ ] Verificar que `req.user.rol === 'PROFESOR'`
  - [ ] Si NO es profesor, retornar 403:
    ```json
    { "error": "Acceso denegado. Solo profesores pueden acceder a este recurso" }
    ```
  - [ ] Si es válido, llamar a `next()` para continuar

- [ ] Exportar middleware para usar en rutas protegidas

### Ejemplo de middleware:
```typescript
import { Request, Response, NextFunction } from 'express';

export const verificarProfesor = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  if (req.user.rol !== 'PROFESOR') {
    return res.status(403).json({ 
      error: 'Acceso denegado. Solo profesores pueden acceder a este recurso' 
    });
  }

  next();
};
```

**Uso en rutas:**
```typescript
router.get('/stats', verificarToken, verificarProfesor, getStats);
```

---

## **📈 5. Endpoints de Estadísticas**

### 5.1. Endpoint: Estadísticas Generales

**Ruta:** `GET /api/admin/stats`

#### Tareas:
- [ ] Crear controlador `src/controllers/admin/stats.controller.ts`
- [ ] Aplicar middlewares: `verificarToken` y `verificarProfesor`
- [ ] Implementar las siguientes queries en Prisma:

**Query 1 - Total Estudiantes:**
- [ ] `totalEstudiantes = await prisma.estudiante.count()`
- Cuenta todos los estudiantes registrados en la plataforma

**Query 2 - Total Proyecciones:**
- [ ] `totalProyecciones = await prisma.proyeccion.count()`
- Cuenta todas las proyecciones creadas (favoritas y no favoritas)

**Query 3 - Proyecciones Favoritas:**
- [ ] `proyeccionesFavoritas = await prisma.proyeccion.count({ where: { favorita: true } })`
- Cuenta solo las proyecciones marcadas como favoritas

**Query 4 - Carreras Activas:**
- [ ] Usar `prisma.estudiante.groupBy()` o `findMany()` con `distinct`
- [ ] Contar carreras únicas con estudiantes activos
- Ejemplo:
  ```typescript
  const carreras = await prisma.estudiante.findMany({
    distinct: ['codigo_carrera'],
    select: { codigo_carrera: true }
  });
  const carrerasActivas = carreras.length;
  ```

**Respuesta esperada (200):**
```json
{
  "totalEstudiantes": 247,
  "totalProyecciones": 892,
  "proyeccionesFavoritas": 247,
  "carrerasActivas": 5
}
```

**Manejo de errores:**
- [ ] Envolver todo en try/catch
- [ ] Retornar 500 en caso de error con mensaje descriptivo

---

### 5.2. Endpoint: Estudiantes por Asignatura

**Ruta:** `GET /api/admin/course/:codigo/projections`  
**Query Params:** `?ano=2025&semestre=1`

#### Tareas:

**Validaciones:**
- [ ] Extraer `codigo` de `req.params`
- [ ] Extraer `ano` y `semestre` de `req.query`
- [ ] Validar que los 3 parámetros estén presentes
- [ ] Retornar 400 si falta alguno:
  ```json
  { "error": "Código de asignatura, año y semestre son requeridos" }
  ```

**Lógica:**
- [ ] Buscar asignatura por código:
  ```typescript
  const asignatura = await prisma.asignatura.findUnique({
    where: { codigo: codigo }
  });
  ```

- [ ] Retornar 404 si no existe:
  ```json
  { "error": "Asignatura no encontrada" }
  ```

- [ ] Buscar items de proyección que coincidan con:
  - `id_asignatura` = asignatura.id
  - `ano_proyectado` = año del query
  - `semestre_proyectado` = semestre del query
  - La proyección padre debe tener `favorita: true`

- [ ] Query ejemplo:
  ```typescript
  const items = await prisma.itemProyeccion.findMany({
    where: {
      id_asignatura: asignatura.id,
      ano_proyectado: parseInt(ano),
      semestre_proyectado: parseInt(semestre),
      proyeccion: {
        favorita: true
      }
    },
    include: {
      proyeccion: {
        include: {
          estudiante: {
            select: {
              rut: true,
              nombre: true,
              email: true
            }
          }
        }
      }
    }
  });
  ```

- [ ] Eliminar duplicados de estudiantes (agrupar por RUT)
- [ ] Contar total de estudiantes únicos

**Respuesta esperada (200):**
```json
{
  "asignatura": {
    "codigo": "INF-239",
    "nombre": "Estructura de Datos",
    "nivel": 3
  },
  "periodo": {
    "ano": 2025,
    "semestre": 1
  },
  "totalEstudiantes": 45,
  "estudiantes": [
    {
      "rut": "12345678-9",
      "nombre": "Juan Pérez",
      "email": "juan.perez@alumnos.ucn.cl"
    },
    {
      "rut": "98765432-1",
      "nombre": "María González",
      "email": "maria.gonzalez@alumnos.ucn.cl"
    }
  ]
}
```

---

### 5.3. Endpoint: Listado de Proyecciones

**Ruta:** `GET /api/admin/projections`  
**Query Params opcionales:**
- `?carrera=ICI` - Filtrar por código de carrera
- `?favoritas=true` - Solo proyecciones favoritas
- `?page=1` - Número de página (paginación opcional)
- `?limit=20` - Cantidad por página (paginación opcional)

#### Tareas:

**Construcción de filtros dinámicos:**
- [ ] Extraer query params: `carrera`, `favoritas`, `page`, `limit`
- [ ] Crear objeto `where` vacío
- [ ] Si `carrera` está presente:
  ```typescript
  where.estudiante = { codigo_carrera: carrera };
  ```

- [ ] Si `favoritas === 'true'`:
  ```typescript
  where.favorita = true;
  ```

- [ ] Calcular paginación (si se implementa):
  ```typescript
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  ```

**Query principal:**
- [ ] Buscar proyecciones con filtros aplicados:
  ```typescript
  const proyecciones = await prisma.proyeccion.findMany({
    where,
    include: {
      estudiante: {
        select: {
          rut: true,
          nombre: true,
          email: true,
          codigo_carrera: true
        }
      },
      itemsProyeccion: {
        include: {
          asignatura: {
            select: {
              codigo: true,
              nombre: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    // skip, // Para paginación
    // take: limit // Para paginación
  });
  ```

- [ ] Contar total de proyecciones que coinciden con los filtros:
  ```typescript
  const total = await prisma.proyeccion.count({ where });
  ```

**Respuesta esperada (200):**
```json
{
  "total": 892,
  "page": 1,
  "limit": 20,
  "proyecciones": [
    {
      "id": "proj-cuid-123",
      "nombre": "Mi proyección 2025-1",
      "favorita": true,
      "createdAt": "2024-12-06T10:30:00Z",
      "estudiante": {
        "rut": "12345678-9",
        "nombre": "Juan Pérez",
        "email": "juan.perez@alumnos.ucn.cl",
        "codigo_carrera": "ICI"
      },
      "totalAsignaturas": 5,
      "asignaturas": [
        {
          "codigo": "INF-239",
          "nombre": "Estructura de Datos",
          "ano": 2025,
          "semestre": 1
        }
      ]
    }
  ]
}
```

---

## **🧪 6. Testing**

### 6.1. Test de Autenticación

**Con Postman / Thunder Client / cURL:**

#### Login exitoso:
- [ ] Hacer POST a `http://localhost:3000/api/admin/login`
- [ ] Body:
  ```json
  {
    "email": "admin@ucn.cl",
    "password": "admin123"
  }
  ```
- [ ] Verificar código 200
- [ ] Verificar que retorna `token` y `profesor`
- [ ] **Guardar el token** para pruebas siguientes

**Ejemplo cURL:**
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ucn.cl","password":"admin123"}'
```

#### Login fallido - Email inexistente:
- [ ] Probar con email que no existe
- [ ] Verificar código 404
- [ ] Mensaje: "Profesor no encontrado"

#### Login fallido - Password incorrecto:
- [ ] Probar con password incorrecto
- [ ] Verificar código 401
- [ ] Mensaje: "Credenciales inválidas"

#### Login fallido - Cuenta inactiva:
- [ ] Cambiar `activo: false` en BD
- [ ] Intentar login
- [ ] Verificar código 403
- [ ] Revertir cambio en BD

---

### 6.2. Test de Estadísticas Generales

**Endpoint:** `GET /api/admin/stats`

#### Con token válido:
- [ ] Hacer GET con header: `Authorization: Bearer {TOKEN}`
- [ ] Verificar código 200
- [ ] Verificar que retorna las 4 estadísticas:
  - `totalEstudiantes` (número)
  - `totalProyecciones` (número)
  - `proyeccionesFavoritas` (número)
  - `carrerasActivas` (número)

**Ejemplo cURL:**
```bash
curl -X GET http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Sin token:
- [ ] Hacer GET sin header Authorization
- [ ] Verificar código 401
- [ ] Mensaje: "Token no proporcionado"

#### Con token de estudiante:
- [ ] Hacer login como estudiante
- [ ] Usar ese token en /admin/stats
- [ ] Verificar código 403
- [ ] Mensaje: "Acceso denegado. Solo profesores..."

---

### 6.3. Test de Estudiantes por Curso

**Endpoint:** `GET /api/admin/course/:codigo/projections?ano=X&semestre=Y`

#### Con parámetros válidos:
- [ ] Elegir un código de asignatura que existe (ej: INF-239)
- [ ] Hacer GET con año y semestre válidos
- [ ] Verificar código 200
- [ ] Verificar estructura de respuesta:
  - Datos de asignatura
  - Periodo (año, semestre)
  - Total de estudiantes
  - Array de estudiantes

**Ejemplo cURL:**
```bash
curl -X GET "http://localhost:3000/api/admin/course/INF-239/projections?ano=2025&semestre=1" \
  -H "Authorization: Bearer {TOKEN}"
```

#### Código de asignatura inexistente:
- [ ] Probar con código que no existe (ej: XXX-999)
- [ ] Verificar código 404
- [ ] Mensaje: "Asignatura no encontrada"

#### Sin parámetros de query:
- [ ] Hacer GET sin `ano` o `semestre`
- [ ] Verificar código 400
- [ ] Mensaje de error claro

---

### 6.4. Test de Listado de Proyecciones

**Endpoint:** `GET /api/admin/projections`

#### Sin filtros:
- [ ] Hacer GET sin query params
- [ ] Verificar código 200
- [ ] Verificar que retorna:
  - `total` (número)
  - `proyecciones` (array)
- [ ] Verificar que cada proyección tiene: id, nombre, favorita, estudiante, etc.

**Ejemplo cURL:**
```bash
curl -X GET http://localhost:3000/api/admin/projections \
  -H "Authorization: Bearer {TOKEN}"
```

#### Con filtro de carrera:
- [ ] Hacer GET con `?carrera=ICI`
- [ ] Verificar que todas las proyecciones pertenecen a estudiantes de ICI
- [ ] Probar con otra carrera (IEI, ICC, etc.)

**Ejemplo:**
```bash
curl -X GET "http://localhost:3000/api/admin/projections?carrera=ICI" \
  -H "Authorization: Bearer {TOKEN}"
```

#### Solo proyecciones favoritas:
- [ ] Hacer GET con `?favoritas=true`
- [ ] Verificar que todas tienen `favorita: true`

**Ejemplo:**
```bash
curl -X GET "http://localhost:3000/api/admin/projections?favoritas=true" \
  -H "Authorization: Bearer {TOKEN}"
```

#### Combinación de filtros:
- [ ] Probar `?carrera=ICI&favoritas=true`
- [ ] Verificar que se aplican ambos filtros

---

## **📝 7. Documentación**

### 7.1. README o Swagger

- [ ] Crear sección "API Admin" en README.md
- [ ] Documentar cada endpoint con:
  - **Método HTTP** (GET, POST)
  - **URL completa**
  - **Headers requeridos** (Authorization: Bearer)
  - **Body de request** (con ejemplos)
  - **Respuestas exitosas** (200) con ejemplos JSON
  - **Respuestas de error** (400, 401, 403, 404, 500) con ejemplos

#### Ejemplo de documentación:

```markdown
## POST /api/admin/login
Autenticación de profesores.

**Headers:**
- Content-Type: application/json

**Body:**
```json
{
  "email": "admin@ucn.cl",
  "password": "admin123"
}
```

**Respuesta 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "profesor": {
    "rut": "12345678-9",
    "nombre": "Dr. Juan Pérez",
    "email": "admin@ucn.cl",
    "rol": "PROFESOR"
  }
}
```

**Errores:**
- 400: Email y password son requeridos
- 401: Credenciales inválidas
- 403: Cuenta deshabilitada
- 404: Profesor no encontrado
```

---

### 7.2. Variables de Entorno

- [ ] Crear archivo `.env.example` en la raíz del proyecto
- [ ] Documentar todas las variables necesarias:

```env
# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/cursoreo

# JWT
JWT_SECRET=tu-secreto-super-seguro-aqui
JWT_EXPIRES_IN=7d

# Puerto del servidor
PORT=3000

# Entorno
NODE_ENV=development
```

- [ ] Agregar `.env` al `.gitignore` si no está

---

### 7.3. Credenciales de Prueba

- [ ] Crear documento `CREDENTIALS.md` (NO subir a Git público)
- [ ] Compartir credenciales de prueba con el equipo:

```markdown
# Credenciales de Prueba - Profesor Admin

**Email:** admin@ucn.cl  
**Password:** admin123

**RUT:** 12345678-9  
**Nombre:** Dr. Juan Pérez  
**Departamento:** Ingeniería de Sistemas

---

## Uso:
1. Hacer POST a /api/admin/login con estas credenciales
2. Guardar el token recibido
3. Usar el token en header Authorization para endpoints protegidos
```

---

### 7.4. Guía de Integración para Frontend

- [ ] Crear documento `FRONTEND_INTEGRATION.md`
- [ ] Incluir:
  - URLs completas de endpoints
  - Formato del token JWT
  - Estructura de respuestas
  - Códigos de error y su significado
  - Ejemplos de llamadas con fetch/axios

#### Ejemplo:

```markdown
# Integración Frontend - Admin Panel

## Base URL
```
http://localhost:3000/api/admin
```

## Autenticación

### Login
```typescript
const response = await fetch('http://localhost:3000/api/admin/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@ucn.cl',
    password: 'admin123'
  })
});

const data = await response.json();
// Guardar token: localStorage.setItem('admin_token', data.token);
```

### Hacer peticiones autenticadas
```typescript
const token = localStorage.getItem('admin_token');

const response = await fetch('http://localhost:3000/api/admin/stats', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## Manejo de Errores

| Código | Significado |
|--------|-------------|
| 400 | Parámetros inválidos o faltantes |
| 401 | Token inválido o expirado |
| 403 | Acceso denegado (no es profesor) |
| 404 | Recurso no encontrado |
| 500 | Error interno del servidor |
```

---

## **🚀 8. Despliegue**

### 8.1. Pre-despliegue

- [ ] Verificar que todas las migraciones están en `/prisma/migrations/`
- [ ] Hacer commit de todas las migraciones
- [ ] Revisar que `.env` está en `.gitignore`
- [ ] Probar todo localmente una última vez

---

### 8.2. Despliegue en Producción

- [ ] Aplicar migraciones en base de datos de producción:
  ```bash
  npx prisma migrate deploy
  ```

- [ ] Ejecutar seed en producción (si es necesario):
  ```bash
  npm run seed
  ```

- [ ] Configurar variables de entorno en el servidor:
  - DATABASE_URL (apuntando a DB de producción)
  - JWT_SECRET (diferente al de desarrollo)
  - JWT_EXPIRES_IN
  - PORT
  - NODE_ENV=production

- [ ] Reiniciar el servidor

---

### 8.3. Smoke Testing en Producción

- [ ] Verificar que el servidor está corriendo
- [ ] Probar login admin:
  ```bash
  curl -X POST https://tu-dominio.com/api/admin/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@ucn.cl","password":"admin123"}'
  ```

- [ ] Verificar que retorna token válido
- [ ] Probar endpoint /stats con el token
- [ ] Verificar que endpoints sin token retornan 401
- [ ] Verificar que endpoints con token de estudiante retornan 403

---

### 8.4. Notificación al Equipo

- [ ] Avisar al frontend que el backend está listo
- [ ] Compartir URL base de producción
- [ ] Compartir credenciales de prueba (si aplica)
- [ ] Compartir documentación actualizada
- [ ] Programar sesión de integración si es necesario

---

## **📊 Resumen de Tareas**

### Distribución por Sección:
- ✅ Base de Datos: **4 tareas**
- ✅ Seed de Datos: **7 tareas**
- ✅ Autenticación: **15 tareas**
- ✅ Autorización: **5 tareas**
- ✅ Estadísticas Generales: **6 tareas**
- ✅ Estudiantes por Curso: **10 tareas**
- ✅ Listado de Proyecciones: **9 tareas**
- ✅ Testing: **12 tareas**
- ✅ Documentación: **8 tareas**
- ✅ Despliegue: **8 tareas**

**TOTAL: 84 tareas** ✨

---

## **🎯 Orden Sugerido de Implementación**

1. **Semana 1:** Base de datos + Seed (tareas 1-2)
2. **Semana 1-2:** Autenticación + Autorización (tareas 3-4)
3. **Semana 2:** Endpoints de estadísticas (tarea 5)
4. **Semana 2-3:** Testing completo (tarea 6)
5. **Semana 3:** Documentación (tarea 7)
6. **Semana 4:** Despliegue y integración (tarea 8)

---

## **💡 Notas Importantes**

### Seguridad:
- ⚠️ **NUNCA** subir contraseñas sin hashear a la BD
- ⚠️ **NUNCA** commitear archivos `.env` con credenciales
- ⚠️ Usar JWT_SECRET fuerte (mínimo 32 caracteres aleatorios)
- ⚠️ Validar TODOS los inputs del usuario

### Buenas Prácticas:
- ✅ Usar try/catch en todos los controladores
- ✅ Logs descriptivos para debugging
- ✅ Mensajes de error claros para el frontend
- ✅ Código comentado en partes complejas
- ✅ Nombres de variables descriptivos

### Testing:
- 🧪 Probar primero con Postman/Thunder Client
- 🧪 No asumir que "debería funcionar"
- 🧪 Probar casos edge (valores nulos, strings vacíos, etc.)
- 🧪 Probar tanto casos de éxito como de error

---

## **📞 Soporte**

Si tienes dudas durante la implementación:
1. Revisa este checklist completo
2. Consulta la documentación de Prisma y Express
3. Pregunta en el canal del equipo
4. Documenta problemas encontrados y soluciones

---

**¡Éxito con la implementación! 🚀**