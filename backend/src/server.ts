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
app.get('/api/avance', async (req, res) => {
    const { rut, codcarrera, catalogo } = req.query;

    if (!rut || !codcarrera || !catalogo) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    try {
        // 1. Obtener la malla
        const mallaResponse = await axios.get(
            `https://losvilos.ucn.cl/hawaii/api/mallas?${codcarrera}-${catalogo}`,
            { headers: { 'X-HAWAII-AUTH': 'jf400fejof13f' } }
        );
        const malla: RamoMalla[] = mallaResponse.data;

        // 2. Obtener el avance
        const avanceResponse = await axios.get(
            'https://puclaro.ucn.cl/eross/avance/avance.php',
            { params: { rut, codcarrera } }
        );
        const avance: RamoAvance[] = avanceResponse.data;

        // 3. Combinar datos
        const ramosConEstado: RamoAvanceCompleto[] = malla.map(ramoMalla => {
            const codigoMalla = ramoMalla.codigo.trim().toUpperCase();
            const ramoAvance = avance.find(a => 
                a.course.trim().toUpperCase() === codigoMalla
            );

            return {
                codigo: ramoMalla.codigo,
                asignatura: ramoMalla.asignatura,
                creditos: ramoMalla.creditos,
                nivel: ramoMalla.nivel,
                status: ramoAvance?.status || 'PENDIENTE',
                nrc: ramoAvance?.nrc,
                period: ramoAvance?.period
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