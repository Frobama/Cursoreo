# Guía Completa: Guardar y Marcar Proyecciones como Favoritas

## Estado Actual
✅ **Backend**: Endpoints implementados en `src/server.ts`
✅ **Frontend**: Componentes React creados (SaveProjectionModal, PlanVisualizer mejorado)
⚠️ **BD**: Esquema modificado, pero tipos de Prisma aún no regenerados

## Pasos Finales para Completar la Implementación

### 1. Regenerar tipos de Prisma (IMPORTANTE)
El error que viste con `favorita` no existe en tipos es porque Prisma no ha regenerado aún. Ejecuta:

```powershell
cd 'C:\Users\benja\OneDrive\Escritorio\UCN lock in\Proyecto Integrador de Software\Cursoreo\backend'
npx prisma generate
```

Esto generará automáticamente los tipos actualizados que incluyen el campo `favorita`.

### 2. Sincronizar la BD (base de datos remota en Supabase)
Una vez los tipos estén regenerados, sincroniza el esquema con Supabase:

**Opción A: Migración (recomendado para producción)**
```powershell
npx prisma migrate dev --name add-proyeccion-favorita
```

**Opción B: Empujar directamente (más rápido en dev)**
```powershell
npx prisma db push
```

Si tienes problemas de conexión con la BD remota, verifica:
- `backend/.env` contiene `DATABASE_URL` válida (debe apuntar a Supabase)
- La conexión a Supabase es accesible desde tu red

### 3. Reiniciar el servidor backend
Después de regenerar y migrar:

```powershell
npm run dev
```

Verifica que no haya errores en la consola. Deberías ver:
```
✅ Base de datos: Conectada a Supabase
📊 Estudiantes en BD: X
```

### 4. Probar endpoints (opcional)
Usa Postman o curl para verificar que los endpoints funcionan:

**Guardar proyección:**
```bash
POST http://localhost:3001/api/proyecciones
Content-Type: application/json

{
  "rut": "12345678-9",
  "nombre_proyeccion": "Plan 2025",
  "items": [
    {
      "id_asignatura": "INF-101",
      "ano_proyectado": 1,
      "semestre_proyectado": 1
    }
  ]
}
```

**Marcar como favorita:**
```bash
POST http://localhost:3001/api/proyeccion/1/favorite
Content-Type: application/json

{
  "favorita": true
}
```

**Obtener proyecciones del estudiante:**
```bash
GET http://localhost:3001/api/proyecciones?rut=12345678-9
```

### 5. Probar desde el Frontend
1. Abre el frontend: `npm run dev` en la carpeta `frontend`
2. Navega a Dashboard
3. Haz clic en "Proyectar egreso" para generar un plan
4. Verás el botón "💾 Guardar Proyección" encima del plan
5. Haz clic, ingresa un nombre y confirma
6. La proyección se guardará en la BD con `favorita = false`

## Flujo Completo de la Funcionalidad

### 1. **Generar Plan (ya existe)**
   - Usuario hace clic en "Proyectar egreso"
   - `Dashboard.tsx` llama a `planSemesters()`
   - Se muestra el plan visualizado con `PlanVisualizer`

### 2. **Guardar Proyección (nuevo)**
   - Usuario hace clic en "💾 Guardar Proyección"
   - Se abre `SaveProjectionModal` (modal bonito)
   - Usuario ingresa nombre (ej: "Plan A - 2025")
   - Al confirmar:
     - Frontend convierte el plan a `items` (asignatura, semestre, año)
     - Llama a `POST /api/proyecciones`
     - Backend crea nueva fila en tabla `Proyeccion` con `favorita = false`
     - Backend crea filas en `ItemProyeccion` para cada curso

### 3. **Marcar como Favorita (próximo paso - opcional)**
   - Usuario puede luego marcar una proyección como favorita
   - Llamar a `POST /api/proyeccion/{id}/favorite` con `favorita: true`
   - Backend automáticamente desmarca otras favoritas del mismo estudiante
   - Solo una proyección por estudiante puede ser favorita

### 4. **Recuperar Proyecciones (próximo paso - opcional)**
   - Crear componente `ProjectionsList` que muestre todas las proyecciones guardadas
   - Llamar a `GET /api/proyecciones?rut={rut}`
   - Mostrar lista con nombre, fecha, y botón para marcar favorita

## Archivos Modificados

### Backend
- ✅ `prisma/schema.prisma` - Agregado campo `favorita` en `Proyeccion`
- ✅ `src/server.ts` - Endpoints POST/GET/DELETE para proyecciones

### Frontend
- ✅ `src/components/SaveProjectionModal.tsx` - Modal para guardar (NUEVO)
- ✅ `src/components/SaveProjectionModal.module.css` - Estilos (NUEVO)
- ✅ `src/components/PlanVisualizer.tsx` - Mejorado con botón guardar y integración modal
- ✅ `src/components/PlanVisualizer.module.css` - Estilos modernos
- ✅ `src/components/Dashboard.tsx` - Pasa `userData` a `PlanVisualizer`

## Próximos Pasos (Opcionales - para completar UI)

### A. Crear pantalla de "Mis Proyecciones"
Componente que liste todas las proyecciones guardadas del estudiante:
- Obtener lista: `GET /api/proyecciones?rut={rut}`
- Mostrar tarjetas con nombre, fecha, botón estrella (favorita), botón eliminar
- Endpoint para eliminar: `DELETE /api/proyeccion/{id}`

### B. Mostrar proyección favorita al cargar Dashboard
- En el `useEffect` inicial, después de cargar avance, obtener favorita:
  ```ts
  const favorita = await fetch(`/api/proyecciones/favorita?rut={rut}`)
  ```
- Mostrar resumen de la favorita en la UI

### C. Editar nombre de proyección
- Agregar endpoint `PATCH /api/proyeccion/{id}` para actualizar nombre
- Mostrar UI para editar directamente desde lista

## Troubleshooting

**Error: "favorita" does not exist**
→ Ejecuta `npx prisma generate` nuevamente

**Error: Cannot find module '@prisma/client'**
→ Ejecuta `npm install` en backend

**Error: "Cannot insert into Proyeccion"**
→ Verifica que la migración se ejecutó exitosamente: `npx prisma migrate resolve --rolled-back add-proyeccion-favorita` (si hay problemas)

**Error: Connection timeout BD**
→ Verifica DATABASE_URL en `backend/.env` y conectividad a Supabase

## Resumen de URLs Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/proyecciones` | Guardar nueva proyección con items |
| GET | `/api/proyecciones?rut=...` | Obtener todas las proyecciones |
| GET | `/api/proyecciones/favorita?rut=...` | Obtener proyección favorita |
| POST | `/api/proyeccion/:id/favorite` | Marcar/desmarcar como favorita |
| DELETE | `/api/proyeccion/:id` | Eliminar proyección |

---

**¿Necesitas ayuda con alguno de estos pasos?** Avísame cuál es el siguiente y lo implementamos juntos.
