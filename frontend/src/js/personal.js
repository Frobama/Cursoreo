document.addEventListener("DOMContentLoaded", () => { 
    const userData = JSON.parse(localStorage.getItem("user"));

    if (!userData){
        window.location.href = "./index.html";
        return;
    }

    document.getElementById("nameLabel").innerText = userData.rut;
});