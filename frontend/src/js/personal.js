document.addEventListener("DOMContentLoaded", async () => { 
    const userData = JSON.parse(localStorage.getItem("user"));

    if (!userData){
        window.location.href = "./index.html";
        return;
    }
    
    async function getAvance(rut, codcarrera){
        const response = await fetch(`https://puclaro.ucn.cl/eross/avance/avance.php?rut=${rut}&codcarrera=${codcarrera}`);
        return await response.json(); // retorna los ramos
    }
    
    // Mostrar cada clave y valor en la página
    const infoDiv = document.createElement("div");
    infoDiv.style.marginTop = "20px";
    infoDiv.innerHTML = "<h3>Datos completos del usuario:</h3>";

    const ul = document.createElement("ul");
    Object.entries(userData).forEach(([key, value]) => {
        const li = document.createElement("li");
        li.textContent = `${key}: ${JSON.stringify(value)}`;
        ul.appendChild(li); 
    });
    infoDiv.appendChild(ul);
    
    document.body.appendChild(infoDiv);
    document.getElementById("mailLabel").innerText = userData.email;
    document.getElementById("nameLabel").innerText = "Rut: " + (userData.rut || "Nombre Genérico 123");
    
    const ramoContainer = document.getElementById("ramoContainer");
    for (const carrera of userData.carreras) {
        ramoContainer.innerHTML += `<h3>${carrera.nombre} (${carrera.codigo})</h3>`;
        const ramos = await getAvance(userData.rut, carrera.codigo);
        if (Array.isArray(ramos) && ramos.status != "APROBADO") {
            ramos.forEach(avance => {
                ramoContainer.innerHTML += `<p>NRC: ${avance.nrc || "Sin NRC"}</p>`;
                
                ramoContainer.innerHTML += `<p>Estado: ${avance.status || "Sin Estado"}</p>`;
                
                ramoContainer.innerHTML += `<hr/>`;
            });
        } else {
            ramoContainer.innerHTML += `<p>No hay ramos para esta carrera.</p>`;
        }
    }
});


