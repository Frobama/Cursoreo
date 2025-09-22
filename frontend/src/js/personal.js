document.addEventListener("DOMContentLoaded", () => { 
    const userData = JSON.parse(localStorage.getItem("user"));

    if (!userData){
        window.location.href = "./index.html";
        return;
    }

    document.getElementById("nameLabel").innerText = userData.rut;

    const codigo = userData.carreras[0].codigo;
    const catalogo = userData.carreras[0].catalogo;

    fetchMalla(codigo,catalogo);
    
});

async function fetchMalla(codigo, catalogo) {
    
    const url = `https://losvilos.ucn.cl/hawaii/api/mallas?8606-202320`;
    const myHeaders = new Headers();
    myHeaders.append("X-HAWAII-AUTH", "jf400fejof13f");


    const requestOptions = {
        method: "GET",
        headers: myHeaders,
        redirect: "follow"
    };

    try {
        const res = await fetch(url, requestOptions)

        let data;
        try {
            data = await res.json();
        } catch (parseErr) {
            console.error("Error parseando JSON: ", parseErr);
            alert("Respuesta inesperada del servidor");
            return;
        }

        if (!res.ok){
            const msg = data?.message || data?.error || `Error ${res.status}`;
            alert("Error: " + msg);
            return;
        }

        if (data.error){
            alert("Error: " + data.error);
            return;
        }

        const ramos = {}
        data.forEach(ramo => {
            const code = ramo.codigo;
            const asig = ramo.asignatura;
            const creditos = ramo.creditos;
            const nivel = ramo.nivel;
            const prereq = ramo.prereq;

            if (!(code  in ramos)){
                ramos[code] = {asig, creditos, nivel, prereq};
            }



        });

        const primerRamo = Object.values(ramos)[0];
        document.getElementById("mailLabel").innerText = primerRamo.asig;
    
    } catch (err) {
        alert("Credenciales incorrectas o error de conexión");
        console.error(err);
    }
    

    
}