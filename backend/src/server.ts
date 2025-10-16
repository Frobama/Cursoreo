import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const port = 3001;

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

app.get('/api/avance', async (req, res) => {
    const { rut, codcarrera } = req.query;

    if (!rut || !codcarrera) {
        return res.status(400).json({ error: 'Faltan los parámetros rut y código de carrera'});
    }

    const externalAvanceUrl = `https://puclaro.ucn.cl/eross/avance/avance.php`;

    console.log('Solicitando avance a la API');

    try {
        const response = await axios.get(externalAvanceUrl, {
            params: { rut, codcarrera }
        });
        res.json(response.data);
    } catch (error: any){
        console.error("Error en la API de avance:", error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: 'Error de conexión con el servidor de avance.' });
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