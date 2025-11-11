import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const port = 3001;

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
        res.json(response.data);
    } catch (error: any){
        console.log('Error en la API de login:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Error de conexión con el servidor de login.' });
    }
})

app.listen(port, () => {
    console.log(`Servidor proxy escuchando en http://localhost:${port}`);
});