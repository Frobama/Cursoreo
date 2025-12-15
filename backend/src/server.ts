import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import './types/express';
import * as jwt from 'jsonwebtoken';

// Cargar variables de entorno
dotenv.config();

// ============================================
// VALIDAR VARIABLES DE ENTORNO REQUERIDAS
// ============================================
const requiredEnvVars = [
    'DATABASE_URL',
    'HAWAII_API_URL',
    'HAWAII_AUTH_TOKEN',
    'PUCLARO_API_URL',
    'JWT_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('ERROR: Faltan las siguientes variables de entorno requeridas:');
    missingEnvVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPor favor, copia .env.example a .env y configura los valores correctos.');
    process.exit(1);
}

console.log('Variables de entorno cargadas correctamente');

// Cliente de Prisma para la base de datos
const prisma = new PrismaClient();

const app = express();
const port = process.env.PORT || 3001;

type RamoMalla = {
    codigo: string;
    asignatura: string;
    creditos: number;
    nivel: number;
    prereq: string;
};

type RamoAvance = {
    nrc: string;
    period: string;
    student: string;
    course: string;
    excluded: boolean;
    inscriptionType: string;
    status: string;
};

type RamoAvanceCompleto = {
    codigo: string;
    asignatura: string;
    creditos: number;
    nivel: number;
    status: string;
    nrc?: string;
    period?: string;
    prereq?: string;
};

app.use(cors());
app.use(express.json());

// ============================================
// MIDDLEWARE DE AUTENTICACIÓN JWT
// ============================================
const verificarToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        req.user = decoded; // Agregar información del usuario al request
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido o expirado' });
    }
};

// ============================================
// ENDPOINTS DE MALLAS Y AVANCE
// ============================================

app.get('/api/mallas', verificarToken, async (req, res) => {
    const { codigoCarrera, catalogo } = req.query;

    if (!codigoCarrera || !catalogo) {
        return res.status(400).json({ error: 'Faltan los parámetros codigoCarrera y catalogo' });
    }

    const externalApiUrl = `${process.env.HAWAII_API_URL}/mallas?${codigoCarrera}-${catalogo}`;

    const requestOptions = {
        headers: {
            'X-HAWAII-AUTH': process.env.HAWAII_AUTH_TOKEN || ''
        }
    };

    console.log(`Solicitando a la API externa`);

    try {
        const response = await axios.get(externalApiUrl, requestOptions);
        res.json(response.data);
    } catch (error) {
        console.log('Error al contactar la API externa:', error);
        res.status(500).json({ error: 'Hubo un error al obtener la malla.' });
    }
});

app.get('/api/avance', verificarToken, async (req, res) => {
    const { rut, codcarrera, catalogo } = req.query;

    if (!rut || !codcarrera || !catalogo) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    try {
        // 1. Obtener la malla
        const mallaResponse = await axios.get(
            `${process.env.HAWAII_API_URL}/mallas?${codcarrera}-${catalogo}`,
            { headers: { 'X-HAWAII-AUTH': process.env.HAWAII_AUTH_TOKEN || '' } }
        );
        const malla: RamoMalla[] = mallaResponse.data;

        // 2. Obtener el avance
        const avanceResponse = await axios.get(
            `${process.env.PUCLARO_API_URL}/avance.php`,
            { params: { rut, codcarrera } }
        );
        const avance: RamoAvance[] = avanceResponse.data;

        // --- INICIO DE LA LÓGICA DE DEDUPLICACIÓN INTELIGENTE ---
        const statusPriority: { [key: string]: number } = {
            'APROBADO': 3,
            'INSCRITO': 2,
            'REPROBADO': 1,
        };

        const avanceUnicoMap = new Map<string, RamoAvance>();

        for (const ramo of avance) {
            if (!ramo || !ramo.course) continue;

            const codigoNormalizado = ramo.course.trim().toUpperCase();
            const estadoActual = String(ramo.status || "").trim().toUpperCase();
            const prioridadActual = statusPriority[estadoActual] || 0;

            const ramoExistente = avanceUnicoMap.get(codigoNormalizado);

            if (!ramoExistente) {
                avanceUnicoMap.set(codigoNormalizado, ramo);
            } else {
                const estadoExistente = String(ramoExistente.status || "").trim().toUpperCase();
                const prioridadExistente = statusPriority[estadoExistente] || 0;

                if (prioridadActual > prioridadExistente) {
                    avanceUnicoMap.set(codigoNormalizado, ramo);
                }
            }
        }
        // --- FIN DE LA LÓGICA DE DEDUPLICACIÓN ---

        // 4. Combinar la malla con los datos de avance únicos y de mayor prioridad
        const ramosConEstado: RamoAvanceCompleto[] = malla.map(ramoMalla => {
            const codigoMallaNormalizado = ramoMalla.codigo.trim().toUpperCase();
            const ramoAvanceUnico = avanceUnicoMap.get(codigoMallaNormalizado);

            return {
                codigo: ramoMalla.codigo,
                asignatura: ramoMalla.asignatura,
                creditos: ramoMalla.creditos,
                nivel: ramoMalla.nivel,
                status: ramoAvanceUnico?.status || 'PENDIENTE',
                nrc: ramoAvanceUnico?.nrc,
                period: ramoAvanceUnico?.period,
                prereq: ramoMalla.prereq
            };
        });

        // NUEVO: Guardar malla en BD (async, no bloquea la respuesta)
        guardarMallaEnBD(malla, codcarrera as string, catalogo as string)
            .catch((err: any) => console.error('Error guardando malla en BD:', err));

        // NUEVO: Guardar avance en BD (async, no bloquea la respuesta)
        guardarAvanceEnBD(rut as string, avanceUnicoMap, malla, codcarrera as string)
            .catch((err: any) => console.error('Error guardando avance en BD:', err));

        res.json(ramosConEstado);

    } catch (error: any) {
        console.error("Error procesando avance:", error.response?.data || error.message);
        res.status(500).json({ error: 'Error al procesar el avance curricular' });
    }
});

// ============================================
// ENDPOINTS DE AUTENTICACIÓN
// ============================================

app.get('/api/login', async (req, res) => {
    const { email, password } = req.query;

    if (!email || !password) {
        return res.status(400).json({ error: 'Faltan los parámetros email y password' });
    }

    const encodedEmail = encodeURIComponent(email as string);
    const encodedPassword = encodeURIComponent(password as string);

    const externalLoginUrl = `${process.env.PUCLARO_API_URL}/login.php?email=${encodedEmail}&password=${encodedPassword}`;

    console.log("Solicitando login");

    try {
        const response = await axios.get(externalLoginUrl);
        const userData = response.data;

        // Si el login es exitoso, guardar/actualizar estudiante en BD
        if (userData && userData.rut) {
            guardarEstudianteEnBD(userData, email as string)
                .catch((err: any) => console.error('Error guardando estudiante en BD:', err));

            // Generar JWT token
            const tokenPayload = {
                rut: userData.rut,
                email: email as string,
                nombre: userData.nombre || '',
                carreras: userData.carreras || []
            };

            const jwtSecret = process.env.JWT_SECRET!;
            const jwtExpires = (process.env.JWT_EXPIRES_IN || '24h') as string;

            const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn: jwtExpires as any });

            console.log(`Token JWT generado para ${userData.rut}`);

            // Enviar respuesta con userData y token
            res.json({
                ...userData,
                token,
                expiresIn: process.env.JWT_EXPIRES_IN || '24h'
            });
        } else {
            // Login fallido
            res.status(401).json({ error: 'Credenciales inválidas' });
        }
    } catch (error: any) {
        console.log('Error en la API de login:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Error de conexión con el servidor de login.' });
    }
});

app.get('/api/validar-token', verificarToken, async (req: any, res: any) => {
    try {
        res.json({
            valid: true,
            user: req.user
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al validar token' });
    }
});

// ============================================
// FUNCIONES DE VALIDACIÓN
// ============================================

function validateProjectionPayload(body: any) {
    if (!body) return { ok: false, error: 'Cuerpo vacío' };
    const { rut, codigoCarrera, catalogo, tipo, plan } = body;
    if (!rut || typeof rut !== 'string') return { ok: false, error: 'rut inválido' };
    if (!codigoCarrera || typeof codigoCarrera !== 'string') return { ok: false, error: 'codigoCarrera inválido' };
    if (!catalogo || typeof catalogo !== 'string') return { ok: false, error: 'catalogo inválido' };
    if (tipo !== 'manual' && tipo !== 'recommended') return { ok: false, error: 'tipo debe ser "manual" o "recommended"' };
    if (!Array.isArray(plan)) return { ok: false, error: 'plan debe ser un arreglo' };
    return { ok: true };
}

// ============================================
// ENDPOINTS DE PROYECCIONES
// ============================================

// POST /api/validar-proyeccion - Validar proyección antes de guardar
app.post('/api/validar-proyeccion', verificarToken, async (req, res) => {
    try {
        const body = req.body;
        const validation = validateProjectionPayload(body);
        if (!validation.ok) return res.status(400).json({ error: validation.error });

        const { rut, codigoCarrera, catalogo, plan } = body;
        const rutNorm = rut.trim();

        // 1. Verificar que el estudiante existe
        const estudiante = await prisma.estudiante.findUnique({
            where: { rut: rutNorm },
            include: {
                EstudianteCarrera: {
                    include: { Carrera: true }
                }
            }
        });

        if (!estudiante) {
            return res.status(404).json({ error: 'Estudiante no encontrado' });
        }

        // 2. Obtener el historial académico del estudiante
        const historial = await prisma.historialAcademico.findMany({
            where: { id_estudiante_fk: estudiante.id_estudiante },
            include: { Asignatura: true }
        });

        // Asignaturas aprobadas e inscritas
        const aprobadas = new Set(
            historial
                .filter(h => h.estado.toUpperCase() === 'APROBADO')
                .map(h => h.Asignatura.codigo_asignatura.toUpperCase())
        );

        const inscritas = new Set(
            historial
                .filter(h => h.estado.toUpperCase() === 'INSCRITO')
                .map(h => h.Asignatura.codigo_asignatura.toUpperCase())
        );

        // 3. Obtener límites de créditos de la carrera
        const carreraEstudiante = estudiante.EstudianteCarrera.find(
            ec => ec.Carrera.codigo_carrera === codigoCarrera
        );

        const creditosMaxRegular = carreraEstudiante?.Carrera.creditos_max_regular || 30;
        const creditosMaxSobrecupo = carreraEstudiante?.Carrera.creditos_max_sobrecupo || 35;

        // 4. Validar cada semestre del plan
        const errores: any[] = [];
        const advertencias: any[] = [];
        const asignaturasProyectadas = new Set<string>();

        for (const semEntry of plan) {
            const semesterNumber = Number(semEntry.semester ?? semEntry.sem ?? semEntry.semestre);
            if (Number.isNaN(semesterNumber)) continue;

            const courses = Array.isArray(semEntry.courses) ? semEntry.courses : [];
            let creditosSemestre = 0;

            for (const c of courses) {
                if (!c || !c.codigo) continue;
                const codigoNorm = String(c.codigo).trim().toUpperCase();

                // 4.1 Verificar que la asignatura existe
                const asignatura = await prisma.asignatura.findUnique({
                    where: { codigo_asignatura: codigoNorm },
                    include: {
                        Prerrequisito_Prerrequisito_id_asignatura_fkToAsignatura: {
                            include: {
                                Asignatura_Prerrequisito_id_asignatura_prerrequisito_fkToAsignatura: true
                            }
                        }
                    }
                });

                if (!asignatura) {
                    errores.push({
                        tipo: 'ASIGNATURA_INEXISTENTE',
                        semestre: semesterNumber,
                        codigo: codigoNorm,
                        mensaje: `La asignatura ${codigoNorm} no existe en el sistema`
                    });
                    continue;
                }

                creditosSemestre += asignatura.creditos;

                // 4.2 Verificar si ya está aprobada
                if (aprobadas.has(codigoNorm)) {
                    advertencias.push({
                        tipo: 'YA_APROBADA',
                        semestre: semesterNumber,
                        codigo: codigoNorm,
                        nombre: asignatura.nombre_asignatura,
                        mensaje: `${codigoNorm} - ${asignatura.nombre_asignatura} ya está aprobada`
                    });
                }

                // 4.3 Verificar si ya está inscrita
                if (inscritas.has(codigoNorm)) {
                    advertencias.push({
                        tipo: 'YA_INSCRITA',
                        semestre: semesterNumber,
                        codigo: codigoNorm,
                        nombre: asignatura.nombre_asignatura,
                        mensaje: `${codigoNorm} - ${asignatura.nombre_asignatura} ya está inscrita`
                    });
                }

                // 4.4 Verificar prerrequisitos
                const prerrequisitos = asignatura.Prerrequisito_Prerrequisito_id_asignatura_fkToAsignatura;
                const faltantes: string[] = [];

                for (const prereq of prerrequisitos) {
                    const codigoPrereq = prereq.Asignatura_Prerrequisito_id_asignatura_prerrequisito_fkToAsignatura.codigo_asignatura.toUpperCase();

                    // Verificar si el prerrequisito está aprobado o se tomará antes en la proyección
                    const estaAprobado = aprobadas.has(codigoPrereq);
                    const seTomaraAntes = Array.from(asignaturasProyectadas).some(ap => {
                        const [semAnt] = ap.split('|');
                        return parseInt(semAnt) < semesterNumber && ap.includes(codigoPrereq);
                    });

                    if (!estaAprobado && !seTomaraAntes) {
                        faltantes.push(codigoPrereq);
                    }
                }

                if (faltantes.length > 0) {
                    errores.push({
                        tipo: 'PRERREQUISITOS_NO_CUMPLIDOS',
                        semestre: semesterNumber,
                        codigo: codigoNorm,
                        nombre: asignatura.nombre_asignatura,
                        faltantes: faltantes,
                        mensaje: `${codigoNorm} - ${asignatura.nombre_asignatura} requiere: ${faltantes.join(', ')}`
                    });
                }

                // Agregar a proyectadas
                asignaturasProyectadas.add(`${semesterNumber}|${codigoNorm}`);
            }

            // 4.5 Verificar límite de créditos
            if (creditosSemestre > creditosMaxSobrecupo) {
                errores.push({
                    tipo: 'EXCEDE_CREDITOS_MAXIMO',
                    semestre: semesterNumber,
                    creditos: creditosSemestre,
                    maximo: creditosMaxSobrecupo,
                    mensaje: `Semestre ${semesterNumber}: ${creditosSemestre} créditos excede el máximo permitido (${creditosMaxSobrecupo})`
                });
            } else if (creditosSemestre > creditosMaxRegular) {
                advertencias.push({
                    tipo: 'EXCEDE_CREDITOS_REGULAR',
                    semestre: semesterNumber,
                    creditos: creditosSemestre,
                    regular: creditosMaxRegular,
                    maximo: creditosMaxSobrecupo,
                    mensaje: `Semestre ${semesterNumber}: ${creditosSemestre} créditos requiere sobrecupo (regular: ${creditosMaxRegular})`
                });
            }
        }

        // 5. Responder con la validación
        const esValido = errores.length === 0;

        return res.json({
            valido: esValido,
            errores: errores,
            advertencias: advertencias,
            resumen: {
                totalErrores: errores.length,
                totalAdvertencias: advertencias.length,
                creditosMaxRegular: creditosMaxRegular,
                creditosMaxSobrecupo: creditosMaxSobrecupo
            }
        });

    } catch (error: any) {
        console.error('POST /api/validar-proyeccion error:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// POST /api/proyecciones - Guardar nueva proyección
app.post('/api/proyecciones', verificarToken, async (req, res) => {
    try {
        const body = req.body;
        console.log("📩 POST /api/proyecciones body:", JSON.stringify(body, null, 2));

        const validation = validateProjectionPayload(body);
        if (!validation.ok) {
            console.log("❌ Validación fallida:", validation.error);
            return res.status(400).json({ error: validation.error });
        }

        console.log("✅ Validación exitosa");

        const { rut, codigoCarrera, catalogo, tipo, plan, nombre_proyeccion } = body;

        const rutNorm = rut.trim();
        console.log(`🔍 Buscando estudiante con RUT: ${rutNorm}`);

        const estudiante = await prisma.estudiante.findUnique({ where: { rut: rutNorm } });
        if (!estudiante) {
            console.log("❌ Estudiante no encontrado");
            return res.status(404).json({ error: 'Estudiante no encontrado' });
        }

        console.log(`✅ Estudiante encontrado: ${estudiante.id_estudiante}`);

        const missingAsignaturas: string[] = [];
        const itemsToCreate: { id_asignatura_fk: number; ano_proyectado: number; semestre_proyectado: number }[] = [];

        const currentYear = new Date().getFullYear();
        console.log(`📅 Año actual para proyección: ${currentYear}`);
        console.log(`📚 Procesando ${plan.length} semestres...`);

        for (const semEntry of plan) {
            const semesterNumber = Number(semEntry.semester ?? semEntry.sem ?? semEntry.semestre);
            if (Number.isNaN(semesterNumber)) {
                console.log(`⚠️ Semestre inválido: ${JSON.stringify(semEntry)}`);
                continue;
            }

            console.log(`  📖 Semestre ${semesterNumber}: ${semEntry.courses.length} cursos`);
            const courses = Array.isArray(semEntry.courses) ? semEntry.courses : [];

            for (const c of courses) {
                if (!c || !c.codigo) {
                    console.log(`    ⚠️ Curso sin código: ${JSON.stringify(c)}`);
                    continue;
                }

                const codigoNorm = String(c.codigo).trim().toUpperCase();
                console.log(`    🔎 Buscando asignatura: ${codigoNorm}`);

                const asignatura = await prisma.asignatura.findUnique({
                    where: { codigo_asignatura: codigoNorm }
                });

                if (!asignatura) {
                    console.log(`    ❌ Asignatura no encontrada: ${codigoNorm}`);
                    missingAsignaturas.push(codigoNorm);
                    continue;
                }

                console.log(`    ✅ Asignatura encontrada: ${asignatura.nombre_asignatura}`);
                itemsToCreate.push({
                    id_asignatura_fk: asignatura.id_asignatura,
                    ano_proyectado: currentYear,
                    semestre_proyectado: semesterNumber
                });
            }
        }

        console.log(`📊 Items a crear (antes deduplicación): ${itemsToCreate.length}`);

        const uniqueItems = Array.from(
            itemsToCreate.reduce((map, it) => {
                if (!map.has(it.id_asignatura_fk)) map.set(it.id_asignatura_fk, it);
                return map;
            }, new Map<number, typeof itemsToCreate[0]>()).values()
        );

        console.log(`📊 Items únicos a crear: ${uniqueItems.length}`);
        console.log(`⚠️ Asignaturas no encontradas: ${missingAsignaturas.join(', ') || 'ninguna'}`);

        if (uniqueItems.length === 0) {
            console.log("⚠️ No hay items válidos para crear proyección");
            return res.status(400).json({ error: 'No hay asignaturas válidas en el plan' });
        }

        // Crear con nested create (sin transacción manual)
        console.log(`💾 Creando proyección: ${nombre_proyeccion}`);
        const created = await prisma.proyeccion.create({
            data: {
                id_estudiante_fk: estudiante.id_estudiante,
                nombre_proyeccion: nombre_proyeccion ? String(nombre_proyeccion).slice(0, 255) : `${tipo.toUpperCase()} - ${new Date().toISOString()}`,
                fecha_creacion: new Date(),
                ItemProyeccion: {
                    create: uniqueItems.map(it => ({
                        id_asignatura_fk: it.id_asignatura_fk,
                        ano_proyectado: it.ano_proyectado,
                        semestre_proyectado: it.semestre_proyectado
                    }))
                }
            },
            include: { ItemProyeccion: true }
        });

        console.log(`✅ Proyección creada: ID ${created.id_proyeccion}`);
        return res.status(201).json({
            ok: true,
            id: created.id_proyeccion,
            missingAsignaturas: Array.from(new Set(missingAsignaturas))
        });

    } catch (error: any) {
        console.error('❌ POST /api/proyecciones error:', error);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// GET /api/proyecciones - Obtener todas las proyecciones de un estudiante
app.get('/api/proyecciones', verificarToken, async (req, res) => {
    const { rut } = req.query;

    if (!rut) {
        return res.status(400).json({ error: 'Parámetro rut es requerido' });
    }

    try {
        const estudiante = await prisma.estudiante.findUnique({
            where: { rut: String(rut) }
        });

        if (!estudiante) {
            return res.status(404).json({ error: 'Estudiante no encontrado' });
        }

        const proyecciones = await prisma.proyeccion.findMany({
            where: { id_estudiante_fk: estudiante.id_estudiante },
            include: {
                ItemProyeccion: {
                    include: { Asignatura: true }
                }
            },
            orderBy: { fecha_creacion: 'desc' }
        });

        res.json(proyecciones);
    } catch (err: any) {
        console.error('❌ Error obteniendo proyecciones:', err);
        res.status(500).json({ error: 'Error obteniendo proyecciones' });
    }
});

// GET /api/proyeccion-favorita - Obtener proyección favorita
app.get('/api/proyeccion-favorita', verificarToken, async (req, res) => {
    const { rut, codigo_carrera, catalogo } = req.query;

    if (!rut) {
        return res.status(400).json({ error: 'Parámetro rut es requerido' });
    }

    try {
        const estudiante = await prisma.estudiante.findUnique({
            where: { rut: String(rut) }
        });

        if (!estudiante) {
            return res.status(404).json({ error: 'Estudiante no encontrado' });
        }

        const proyeccionFavorita = await prisma.proyeccion.findFirst({
            where: {
                id_estudiante_fk: estudiante.id_estudiante,
                favorita: true
            },
            include: {
                ItemProyeccion: {
                    include: { Asignatura: true }
                }
            }
        });

        if (!proyeccionFavorita) {
            return res.json({ ok: false, proyeccion: null });
        }

        // Transformar a formato frontend (PlanSemester[])
        const itemsAgrupados = proyeccionFavorita.ItemProyeccion.reduce((acc, item) => {
            const sem = item.semestre_proyectado;
            if (!acc[sem]) acc[sem] = [];
            acc[sem].push({
                codigo: item.Asignatura.codigo_asignatura,
                asignatura: item.Asignatura.nombre_asignatura,
                creditos: item.Asignatura.creditos
            });
            return acc;
        }, {} as any);

        const plan = Object.keys(itemsAgrupados)
            .map(Number)
            .sort((a, b) => a - b)
            .map(sem => ({
                semester: sem,
                courses: itemsAgrupados[sem],
                totalCredits: itemsAgrupados[sem].reduce((sum: number, c: any) => sum + c.creditos, 0)
            }));

        res.json({
            ok: true,
            proyeccion: {
                id_proyeccion: proyeccionFavorita.id_proyeccion,
                nombre_proyeccion: proyeccionFavorita.nombre_proyeccion,
                tipo: 'manual',
                fecha_creacion: proyeccionFavorita.fecha_creacion?.toISOString(),
                plan
            }
        });
    } catch (err: any) {
        console.error('❌ Error obteniendo favorita:', err);
        res.status(500).json({ error: 'Error obteniendo proyección favorita' });
    }
});

// POST /api/proyeccion/:id/favorite - Marcar/desmarcar como favorita
app.post('/api/proyeccion/:id/favorite', verificarToken, async (req, res) => {
    const id = Number(req.params.id);
    const { favorita } = req.body as { favorita?: boolean };

    try {
        const proyeccion = await prisma.proyeccion.findUnique({
            where: { id_proyeccion: id }
        });
        if (!proyeccion) {
            return res.status(404).json({ error: 'Proyección no encontrada' });
        }

        const estudianteId = proyeccion.id_estudiante_fk;

        let setFavorita = favorita;
        if (setFavorita === undefined) {
            setFavorita = !proyeccion.favorita;
        }

        if (setFavorita) {
            // Desmarcar otras favoritas del mismo estudiante
            await prisma.$transaction([
                prisma.proyeccion.updateMany({
                    where: { id_estudiante_fk: estudianteId, favorita: true },
                    data: { favorita: false }
                }),
                prisma.proyeccion.update({
                    where: { id_proyeccion: id },
                    data: { favorita: true }
                })
            ]);
            console.log(`⭐ Proyección ${id} marcada como favorita`);
        } else {
            await prisma.proyeccion.update({
                where: { id_proyeccion: id },
                data: { favorita: false }
            });
            console.log(`☆ Proyección ${id} desmarcada como favorita`);
        }

        res.json({ ok: true, favorita: setFavorita });
    } catch (err: any) {
        console.error('❌ Error marcando favorita:', err);
        res.status(500).json({ error: 'Error marcando favorita' });
    }
});

// DELETE /api/proyeccion/:id - Eliminar proyección
app.delete('/api/proyeccion/:id', verificarToken, async (req, res) => {
    const id = Number(req.params.id);

    try {
        const proyeccion = await prisma.proyeccion.findUnique({
            where: { id_proyeccion: id }
        });

        if (!proyeccion) {
            return res.status(404).json({ error: 'Proyección no encontrada' });
        }

        await prisma.proyeccion.delete({
            where: { id_proyeccion: id }
        });

        console.log(`🗑️ Proyección ${id} eliminada`);
        res.json({ ok: true });
    } catch (err: any) {
        console.error('❌ Error eliminando proyección:', err);
        res.status(500).json({ error: 'Error eliminando proyección' });
    }
});

// ============================================
// FUNCIONES AUXILIARES PARA BD
// ============================================

async function guardarMallaEnBD(
    malla: RamoMalla[],
    codCarrera: string,
    catalogo: string
) {
    console.log(`📚 Guardando malla curricular de ${codCarrera}-${catalogo} en BD...`);

    try {
        let carrera = await prisma.carrera.findUnique({
            where: { codigo_carrera: codCarrera }
        });

        if (!carrera) {
            console.log(`📚 Creando carrera ${codCarrera}`);
            carrera = await prisma.carrera.create({
                data: {
                    codigo_carrera: codCarrera,
                    nombre_carrera: `Carrera ${codCarrera}`,
                }
            });
        }

        let mallaCurricular = await prisma.mallaCurricular.findFirst({
            where: {
                id_carrera_fk: carrera.id_carrera,
                catalogo: catalogo
            }
        });

        if (!mallaCurricular) {
            console.log(`📚 Creando malla ${codCarrera}-${catalogo}`);
            mallaCurricular = await prisma.mallaCurricular.create({
                data: {
                    id_carrera_fk: carrera.id_carrera,
                    catalogo: catalogo
                }
            });
        }

        let asignaturasCreadas = 0;
        let relacionesCreadas = 0;

        for (const ramo of malla) {
            const codigoNormalizado = ramo.codigo.trim().toUpperCase();

            let asignatura = await prisma.asignatura.findUnique({
                where: { codigo_asignatura: codigoNormalizado }
            });

            if (!asignatura) {
                asignatura = await prisma.asignatura.create({
                    data: {
                        codigo_asignatura: codigoNormalizado,
                        nombre_asignatura: ramo.asignatura,
                        creditos: ramo.creditos
                    }
                });
                asignaturasCreadas++;
            }

            const relacionExistente = await prisma.mallaAsignatura.findUnique({
                where: {
                    id_malla_id_asignatura: {
                        id_malla: mallaCurricular.id_malla,
                        id_asignatura: asignatura.id_asignatura
                    }
                }
            });

            if (!relacionExistente) {
                await prisma.mallaAsignatura.create({
                    data: {
                        id_malla: mallaCurricular.id_malla,
                        id_asignatura: asignatura.id_asignatura,
                        nivel_sugerido: ramo.nivel
                    }
                });
                relacionesCreadas++;
            }

            if (ramo.prereq && ramo.prereq !== '-') {
                await guardarPrerrequisitos(asignatura.id_asignatura, ramo.prereq);
            }
        }

        console.log(`✅ Malla ${codCarrera}-${catalogo} guardada:`);
        console.log(`   📝 Asignaturas nuevas: ${asignaturasCreadas}`);
        console.log(`   🔗 Relaciones MallaAsignatura creadas: ${relacionesCreadas}`);

    } catch (error: any) {
        console.error('❌ Error en guardarMallaEnBD:', error.message);
        throw error;
    }
}

async function guardarPrerrequisitos(idAsignatura: number, prereqString: string) {
    try {
        const prereqCodigos = prereqString
            .split(',')
            .map(p => p.trim().toUpperCase())
            .filter(p => p && p !== '-');

        for (const codigoPrereq of prereqCodigos) {
            const asignaturaPrereq = await prisma.asignatura.findUnique({
                where: { codigo_asignatura: codigoPrereq }
            });

            if (asignaturaPrereq) {
                const prereqExistente = await prisma.prerrequisito.findFirst({
                    where: {
                        id_asignatura_fk: idAsignatura,
                        id_asignatura_prerrequisito_fk: asignaturaPrereq.id_asignatura
                    }
                });

                if (!prereqExistente) {
                    await prisma.prerrequisito.create({
                        data: {
                            id_asignatura_fk: idAsignatura,
                            id_asignatura_prerrequisito_fk: asignaturaPrereq.id_asignatura
                        }
                    });
                }
            } else {
                console.warn(`⚠️ Prerrequisito ${codigoPrereq} no encontrado en BD`);
            }
        }
    } catch (error: any) {
        console.error(`❌ Error guardando prerrequisitos:`, error.message);
    }
}

async function guardarEstudianteEnBD(userData: any, emailFromRequest: string) {
    try {
        console.log('🔍 Datos recibidos en guardarEstudianteEnBD:', JSON.stringify(userData, null, 2));

        const { rut, carreras } = userData;
        const email = emailFromRequest;

        if (!rut || !email) {
            console.warn('⚠️ Datos incompletos para guardar estudiante');
            return;
        }

        console.log(`👤 Guardando/actualizando estudiante ${rut} en BD...`);

        const estudiante = await prisma.estudiante.upsert({
            where: { rut },
            update: { email },
            create: {
                rut,
                email,
                nombre_completo: userData.nombre || 'Nombre pendiente',
            }
        });

        if (carreras && Array.isArray(carreras)) {
            for (const carrera of carreras) {
                const { codigo, catalogo, nombre } = carrera;

                let carreraDB = await prisma.carrera.findUnique({
                    where: { codigo_carrera: codigo }
                });

                if (!carreraDB) {
                    console.log(`📚 Creando carrera ${codigo}`);
                    carreraDB = await prisma.carrera.create({
                        data: {
                            codigo_carrera: codigo,
                            nombre_carrera: nombre || 'Nombre pendiente',
                        }
                    });
                }

                const relacionExiste = await prisma.estudianteCarrera.findFirst({
                    where: {
                        id_estudiante_fk: estudiante.id_estudiante,
                        id_carrera_fk: carreraDB.id_carrera
                    }
                });

                if (!relacionExiste) {
                    console.log(`🔗 Vinculando estudiante con carrera ${codigo}`);
                    await prisma.estudianteCarrera.create({
                        data: {
                            id_estudiante_fk: estudiante.id_estudiante,
                            id_carrera_fk: carreraDB.id_carrera,
                            catalogo: catalogo || '2024'
                        }
                    });
                }
            }
        }

        console.log(`✅ Estudiante ${rut} guardado en BD`);

    } catch (error: any) {
        console.error('❌ Error en guardarEstudianteEnBD:', error.message);
        throw error;
    }
}

async function guardarAvanceEnBD(
    rut: string,
    avanceNormalizado: Map<string, RamoAvance>,
    malla: RamoMalla[],
    codCarrera: string
) {
    console.log(`💾 Guardando avance de ${rut} en BD...`);

    try {
        const estudiante = await prisma.estudiante.findUnique({
            where: { rut }
        });

        if (!estudiante) {
            console.log(`⚠️ Estudiante ${rut} no encontrado en BD. Debe hacer login primero.`);
            return;
        }

        for (const [codigoCurso, datosCurso] of avanceNormalizado.entries()) {

            const ramoEnMalla = malla.find(r =>
                r.codigo.trim().toUpperCase() === codigoCurso
            );

            if (!ramoEnMalla) {
                console.warn(`⚠️ Asignatura ${codigoCurso} no encontrada en malla`);
                continue;
            }

            let asignatura = await prisma.asignatura.findUnique({
                where: { codigo_asignatura: codigoCurso }
            });

            if (!asignatura) {
                console.log(`📝 Creando asignatura ${codigoCurso}`);
                asignatura = await prisma.asignatura.create({
                    data: {
                        codigo_asignatura: codigoCurso,
                        nombre_asignatura: ramoEnMalla.asignatura,
                        creditos: ramoEnMalla.creditos
                    }
                });
            }

            if (!datosCurso.period) {
                console.warn(`⚠️ Período faltante para ${codigoCurso}`);
                continue;
            }

            let ano: number | null = null;
            let periodo: number | null = null;

            let match = datosCurso.period.match(/(\d{4})[-\/\.](\d)/);
            if (match) {
                ano = parseInt(match[1]);
                periodo = parseInt(match[2]);
            } else {
                match = datosCurso.period.match(/(\d{4})(\d{1,2})/);
                if (match) {
                    ano = parseInt(match[1]);
                    periodo = parseInt(match[2]);
                }
            }

            if (!ano || !periodo) {
                console.warn(`⚠️ Formato de período inválido: ${datosCurso.period}`);
                continue;
            }

            let semestre = await prisma.semestreAcademico.findFirst({
                where: { ano, periodo }
            });

            if (!semestre) {
                console.log(`📅 Creando semestre ${ano}-${periodo}`);
                semestre = await prisma.semestreAcademico.create({
                    data: { ano, periodo }
                });
            }

            const estadoNormalizado = datosCurso.status.trim().toUpperCase();
            const nrcNumerico = datosCurso.nrc ? parseInt(datosCurso.nrc) : null;

            await prisma.historialAcademico.upsert({
                where: {
                    id_estudiante_fk_id_asignatura_fk_id_semestre_fk: {
                        id_estudiante_fk: estudiante.id_estudiante,
                        id_asignatura_fk: asignatura.id_asignatura,
                        id_semestre_fk: semestre.id_semestre
                    }
                },
                update: {
                    estado: estadoNormalizado,
                    nrc: nrcNumerico
                },
                create: {
                    id_estudiante_fk: estudiante.id_estudiante,
                    id_asignatura_fk: asignatura.id_asignatura,
                    id_semestre_fk: semestre.id_semestre,
                    estado: estadoNormalizado,
                    nrc: nrcNumerico,
                    nota_final: null
                }
            });
        }

        console.log(`✅ Avance de ${rut} guardado exitosamente en BD`);

    } catch (error: any) {
        console.error('❌ Error en guardarAvanceEnBD:', error.message);
        throw error;
    }
}

// ============================================
// INICIAR SERVIDOR
// ============================================

// ENDPOINTS ADMIN - Estadísticas
app.get('/api/admin/stats', verificarToken, async (req, res) => {
    try {
        const totalEstudiantes = await prisma.estudiante.count();
        const totalProyecciones = await prisma.proyeccion.count();
        const proyeccionesFavoritas = await prisma.proyeccion.count({ where: { favorita: true } });

        // Número de carreras que tienen al menos un estudiante (estudianteCarrera)
        const carrerasGroup = await prisma.estudianteCarrera.groupBy({ by: ['id_carrera_fk'] });
        const carrerasActivas = carrerasGroup.length;

        // Ramos más populares entre proyecciones (top N) — limitar a asignaturas del profesor logueado
        const limit = Number(req.query.limit) || 5;
        let topCourses: Array<{ codigo: string; nombre: string; count: number }> = [];

        try {
            const user = (req as any).user as any;
            if (user && user.id) {
                // obtener asignaturas asignadas al profesor
                const profesorId = BigInt(String(user.id));
                const asigns = await prisma.profesorAsignatura.findMany({
                    where: { id_profesor_fk: profesorId },
                    select: { id_asignatura_fk: true }
                });
                const asignIds = asigns.map(a => a.id_asignatura_fk);

                if (asignIds.length > 0) {
                    const grouped = await prisma.itemProyeccion.groupBy({
                        by: ['id_asignatura_fk'],
                        where: { id_asignatura_fk: { in: asignIds } },
                        _count: { id_item: true },
                        orderBy: { _count: { id_item: 'desc' } },
                        take: limit
                    });

                    topCourses = await Promise.all(grouped.map(async g => {
                        const asign = await prisma.asignatura.findUnique({ where: { id_asignatura: g.id_asignatura_fk } });
                        return {
                            codigo: asign?.codigo_asignatura || 'UNKNOWN',
                            nombre: asign?.nombre_asignatura || 'Asignatura desconocida',
                            count: g._count.id_item
                        };
                    }));
                }
            }
        } catch (err) {
            console.warn('No se pudieron calcular topCourses específicos del profesor, usando vacío:', err);
            topCourses = [];
        }

        res.json({
            stats: {
                totalEstudiantes,
                totalProyecciones,
                proyeccionesFavoritas,
                carrerasActivas,
                topCourses
            }
        });
    } catch (error: any) {
        console.error('Error GET /api/admin/stats:', error);
        res.status(500).json({ error: 'Error obteniendo estadísticas' });
    }
});

app.listen(port, async () => {
    console.log(`🚀 Servidor escuchando en http://localhost:${port}`);

    try {
        await prisma.$connect();
        console.log(`✅ Base de datos: Conectada a Supabase`);

        const estudiantesCount = await prisma.estudiante.count();
        console.log(`📊 Estudiantes en BD: ${estudiantesCount}`);
    } catch (error: any) {
        console.error(`❌ Error conectando a BD:`, error.message);
        console.error(`🔍 DATABASE_URL configurado:`, process.env.DATABASE_URL ? 'SÍ' : 'NO');
    }
});

// LOGIN ADMIN (Profesores)
app.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('POST /api/admin/login body:', { email: String(email) });
        if (!email || !password) return res.status(400).json({ error: 'Faltan email o password' });

        const profesor = await prisma.profesor.findFirst({ where: { correo: String(email) } });
        if (!profesor) return res.status(401).json({ error: 'Credenciales inválidas' });

        // Nota: la columna en la BD se mapeó a `contrasena` en Prisma
        if (profesor.contrasena !== String(password)) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const payload = {
            id: String(profesor.id),
            correo: profesor.correo,
            nombre: profesor.nombre,
            departamento: profesor.departamento,
            rol: profesor.rol || 'Profesor'
        };

        const secret: jwt.Secret = process.env.JWT_SECRET as jwt.Secret;
        const signOptions: jwt.SignOptions = { expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as unknown as jwt.SignOptions['expiresIn'] };
        const token = jwt.sign(payload as string | object | Buffer, secret, signOptions);

        // Responder sin la contraseña
        const profesorSafe = {
            id: String(profesor.id),
            nombre: profesor.nombre,
            correo: profesor.correo,
            departamento: profesor.departamento,
            rol: profesor.rol
        };

        res.json({ profesor: profesorSafe, token, expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
    } catch (error: any) {
        console.error('Error POST /api/admin/login:', error?.stack || error);
        res.status(500).json({ error: error?.message || 'Error en login admin' });
    }
});

// GET /api/admin/my-assignatures - Obtener asignaturas asociadas al profesor logueado
app.get('/api/admin/my-assignatures', verificarToken, async (req, res) => {
    try {
        const user = req.user as any;
        if (!user || !user.id) return res.status(400).json({ error: 'Profesor no identificado en token' });
        const profesorId = BigInt(user.id);

        const asignaturas = await prisma.profesorAsignatura.findMany({
            where: { id_profesor_fk: profesorId },
            include: { Asignatura: true }
        });

        const result = asignaturas.map(a => ({ codigo: a.Asignatura.codigo_asignatura, nombre: a.Asignatura.nombre_asignatura }));
        return res.json({ asignaturas: result });
    } catch (error: any) {
        console.error('Error GET /api/admin/my-assignatures:', error?.stack || error);
        res.status(500).json({ error: error?.message || 'Error obteniendo asignaturas del profesor' });
    }
});

// GET /api/admin/projections - Listar proyecciones (opcionalmente filtrar por carrera y favoritas)
app.get('/api/admin/projections', verificarToken, async (req, res) => {
    try {
        const carrera = typeof req.query.carrera === 'string' ? req.query.carrera : undefined;
        const favoritas = String(req.query.favoritas) === 'true';

        const where: any = {};
        if (favoritas) where.favorita = true;

        if (carrera) {
            where.Estudiante = {
                EstudianteCarrera: {
                    some: {
                        Carrera: { codigo_carrera: carrera }
                    }
                }
            };
        }

        const proyecciones = await prisma.proyeccion.findMany({
            where,
            include: {
                Estudiante: {
                    select: { id_estudiante: true, rut: true, nombre_completo: true, email: true }
                },
                ItemProyeccion: {
                    include: { Asignatura: true }
                }
            },
            orderBy: { fecha_creacion: 'desc' }
        });

        return res.json({ total: proyecciones.length, proyecciones });
    } catch (error: any) {
        console.error('Error GET /api/admin/projections:', error?.stack || error);
        res.status(500).json({ error: error?.message || 'Error obteniendo proyecciones' });
    }
});