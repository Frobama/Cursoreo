import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Cliente de Prisma para la base de datos
const prisma = new PrismaClient();

const app = express();
const port = process.env.PORT || 3001;

type RamoMalla = {    codigo: string;
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
};

app.use(cors());

app.get('/api/mallas', async (req, res) => {
    const { codigoCarrera, catalogo } = req.query;

    if (!codigoCarrera || !catalogo) {
        return res.status(400).json({ error: 'Faltan los parámetros codigoCarrera y catalogo'});
    }

    const externalApiUrl = `https://losvilos.ucn.cl/hawaii/api/mallas?${codigoCarrera}-${catalogo}`;

    const authToken = 'jf400fejof13f';

    const requestOptions = {
        headers: {
            'X-HAWAII-AUTH': authToken
        }
    };

    console.log(`Solicitando a la API externa`);

    try{
        const response = await axios.get(externalApiUrl, requestOptions);
        res.json(response.data);
    } catch (error) {
        console.log('Error al contactar la API externa:', error);
        res.status(500).json({ error: 'Hubo un error al obtener la malla.'});
    }
});

// Modificar el endpoint /api/avance
// Modificar el endpoint /api/avance
app.get('/api/avance', async (req, res) => {
    const { rut, codcarrera, catalogo } = req.query;

    if (!rut || !codcarrera || !catalogo) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    try {
        // 1. Obtener la malla (sin cambios)
        const mallaResponse = await axios.get(
            `https://losvilos.ucn.cl/hawaii/api/mallas?${codcarrera}-${catalogo}`,
            { headers: { 'X-HAWAII-AUTH': 'jf400fejof13f' } }
        );
        const malla: RamoMalla[] = mallaResponse.data;

        // 2. Obtener el avance (sin cambios)
        const avanceResponse = await axios.get(
            'https://puclaro.ucn.cl/eross/avance/avance.php',
            { params: { rut, codcarrera } }
        );
        const avance: RamoAvance[] = avanceResponse.data;

        // --- INICIO DE LA LÓGICA DE DEDUPLICACIÓN INTELIGENTE ---

        // 3a. Definir la prioridad de los estados
        const statusPriority: { [key: string]: number } = {
            'APROBADO': 3,
            'INSCRITO': 2,
            'REPROBADO': 1,
        };

        // 3b. Crear un mapa para guardar el mejor ramo del avance encontrado para cada código
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
            // Buscamos en nuestro nuevo mapa de ramos únicos
            const ramoAvanceUnico = avanceUnicoMap.get(codigoMallaNormalizado);

            return {
                codigo: ramoMalla.codigo,
                asignatura: ramoMalla.asignatura,
                creditos: ramoMalla.creditos,
                nivel: ramoMalla.nivel,
                status: ramoAvanceUnico?.status || 'PENDIENTE',
                nrc: ramoAvanceUnico?.nrc,
                period: ramoAvanceUnico?.period,
                // Aquí puedes añadir la propiedad 'prereq' si la necesitas en el frontend
                prereq: ramoMalla.prereq
            };
        });

        // NUEVO: Guardar malla en BD (async, no bloquea la respuesta)
        guardarMallaEnBD(malla, codcarrera as string, catalogo as string)
            .catch((err: any) => console.error('❌ Error guardando malla en BD:', err));

        // NUEVO: Guardar avance en BD (async, no bloquea la respuesta)
        guardarAvanceEnBD(rut as string, avanceUnicoMap, malla, codcarrera as string)
            .catch((err: any) => console.error('❌ Error guardando avance en BD:', err));

        res.json(ramosConEstado);

    } catch (error: any) {
        console.error("Error procesando avance:", error.response?.data || error.message);
        res.status(500).json({ error: 'Error al procesar el avance curricular' });
    }
});

app.get('/api/login', async (req, res) => {
    const { email, password } = req.query;

    if (!email || !password) {
        return res.status(400).json({ error: 'Faltan los parámetros email y password' });
    }

    const encodedEmail = encodeURIComponent(email as string);
    const encodedPassword = encodeURIComponent(password as string);

    const externalLoginUrl = `https://puclaro.ucn.cl/eross/avance/login.php?email=${encodedEmail}&password=${encodedPassword}`;

    console.log("Solicitando login");

    try {
        const response = await axios.get(externalLoginUrl);
        const userData = response.data;

        // Si el login es exitoso, guardar/actualizar estudiante en BD
        if (userData && userData.rut) {
            // Agregar el email al userData ya que la API no lo retorna
            guardarEstudianteEnBD(userData, email as string)
                .catch((err: any) => console.error('❌ Error guardando estudiante en BD:', err));
        }

        res.json(userData);
    } catch (error: any){
        console.log('Error en la API de login:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Error de conexión con el servidor de login.' });
    }
});

// ============================================
// FUNCIÓN PARA GUARDAR MALLA CURRICULAR EN BD
// ============================================
async function guardarMallaEnBD(
    malla: RamoMalla[], 
    codCarrera: string, 
    catalogo: string
) {
    console.log(`📚 Guardando malla curricular de ${codCarrera}-${catalogo} en BD...`);

    try {
        // 1. Buscar o crear la carrera
        let carrera = await prisma.carrera.findUnique({
            where: { codigo_carrera: codCarrera }
        });

        if (!carrera) {
            console.log(`📚 Creando carrera ${codCarrera}`);
            carrera = await prisma.carrera.create({
                data: {
                    codigo_carrera: codCarrera,
                    nombre_carrera: `Carrera ${codCarrera}`, // TODO: Obtener nombre real
                }
            });
        }

        // 2. Buscar o crear la Malla (entidad que representa carrera + catálogo)
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

        // 3. Por cada ramo de la malla, crear asignaturas y relaciones
        for (const ramo of malla) {
            const codigoNormalizado = ramo.codigo.trim().toUpperCase();

            // 3.1 Buscar o crear asignatura
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

            // 3.2 Crear relación en MallaAsignatura (si no existe)
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

            // 3.3 Guardar prerrequisitos si existen
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

// ============================================
// FUNCIÓN PARA GUARDAR PRERREQUISITOS
// ============================================
async function guardarPrerrequisitos(idAsignatura: number, prereqString: string) {
    try {
        // El prereq puede venir en formatos como: "INF-123", "INF-123,INF-124", etc.
        const prereqCodigos = prereqString
            .split(',')
            .map(p => p.trim().toUpperCase())
            .filter(p => p && p !== '-');

        for (const codigoPrereq of prereqCodigos) {
            // Buscar la asignatura prerequisito
            const asignaturaPrereq = await prisma.asignatura.findUnique({
                where: { codigo_asignatura: codigoPrereq }
            });

            if (asignaturaPrereq) {
                // Verificar si ya existe la relación
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

// ============================================
// FUNCIÓN PARA GUARDAR ESTUDIANTE EN BD
// ============================================
async function guardarEstudianteEnBD(userData: any, emailFromRequest: string) {
    try {
        console.log('🔍 Datos recibidos en guardarEstudianteEnBD:', JSON.stringify(userData, null, 2));
        
        const { rut, carreras } = userData;
        const email = emailFromRequest; // Usar el email del request de login

        if (!rut || !email) {
            console.warn('⚠️ Datos incompletos para guardar estudiante');
            console.log('   RUT:', rut);
            console.log('   Email:', email);
            return;
        }

        console.log(`👤 Guardando/actualizando estudiante ${rut} en BD...`);

        // Buscar o crear estudiante
        const estudiante = await prisma.estudiante.upsert({
            where: { rut },
            update: {
                email,
                // nombre_completo se puede actualizar si viene en userData
            },
            create: {
                rut,
                email,
                nombre_completo: userData.nombre || 'Nombre pendiente', // Ajusta según lo que retorne la API
            }
        });

        // Si hay carreras, guardar relación Estudiante-Carrera
        if (carreras && Array.isArray(carreras)) {
            for (const carrera of carreras) {
                const { codigo, catalogo, nombre } = carrera;

                // Buscar o crear carrera
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

                // Crear relación Estudiante-Carrera si no existe
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

// ============================================
// FUNCIÓN PARA GUARDAR AVANCE EN BASE DE DATOS
// ============================================
async function guardarAvanceEnBD(
    rut: string, 
    avanceNormalizado: Map<string, RamoAvance>, 
    malla: RamoMalla[],
    codCarrera: string
) {
    console.log(`💾 Guardando avance de ${rut} en BD...`);

    try {
        // 1. Buscar estudiante en BD
        const estudiante = await prisma.estudiante.findUnique({
            where: { rut }
        });

        if (!estudiante) {
            console.log(`⚠️ Estudiante ${rut} no encontrado en BD. Debe hacer login primero.`);
            return;
        }

        // 2. Por cada ramo del avance normalizado
        for (const [codigoCurso, datosCurso] of avanceNormalizado.entries()) {
            
            // 2.1 Buscar datos del ramo en la malla
            const ramoEnMalla = malla.find(r => 
                r.codigo.trim().toUpperCase() === codigoCurso
            );

            if (!ramoEnMalla) {
                console.warn(`⚠️ Asignatura ${codigoCurso} no encontrada en malla`);
                continue;
            }

            // 2.2 Buscar o crear asignatura
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

            // 2.3 Parsear período 
            // Soporta formatos: "2024-1", "20241", "2024/1", "2024.1"
            if (!datosCurso.period) {
                console.warn(`⚠️ Período faltante para ${codigoCurso}`);
                continue;
            }
            
            // Intentar múltiples formatos
            let ano: number | null = null;
            let periodo: number | null = null;
            
            // Formato: "2024-1" o "2024/1" o "2024.1"
            let match = datosCurso.period.match(/(\d{4})[-\/\.](\d)/);
            if (match) {
                ano = parseInt(match[1]);
                periodo = parseInt(match[2]);
            } else {
                // Formato: "20241" (6 dígitos, últimos 1-2 son el período)
                match = datosCurso.period.match(/(\d{4})(\d{1,2})/);
                if (match) {
                    ano = parseInt(match[1]);
                    periodo = parseInt(match[2]);
                }
            }
            
            if (!ano || !periodo) {
                console.warn(`⚠️ Formato de período inválido: ${datosCurso.period}`);
                console.log(`   Formatos esperados: "2024-1", "20241", "2024/1", "2024.1"`);
                continue;
            }

            // 2.4 Buscar o crear semestre académico
            let semestre = await prisma.semestreAcademico.findFirst({
                where: { ano, periodo }
            });

            if (!semestre) {
                console.log(`📅 Creando semestre ${ano}-${periodo}`);
                semestre = await prisma.semestreAcademico.create({
                    data: { ano, periodo }
                });
            }

            // 2.5 Guardar/actualizar en historial académico
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

app.listen(port, async () => {
    console.log(`🚀 Servidor escuchando en http://localhost:${port}`);
    
    // Test de conexión a la base de datos
    try {
        await prisma.$connect();
        console.log(`✅ Base de datos: Conectada a Supabase`);
        
        // Verificar que podamos hacer queries
        const estudiantesCount = await prisma.estudiante.count();
        console.log(`📊 Estudiantes en BD: ${estudiantesCount}`);
    } catch (error: any) {
        console.error(`❌ Error conectando a BD:`, error.message);
        console.error(`🔍 DATABASE_URL configurado:`, process.env.DATABASE_URL ? 'SÍ' : 'NO');
    }
});