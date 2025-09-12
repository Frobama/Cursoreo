const loginButton = document.getElementById("loginButton");

const requestOptions = {
  method: "GET",
  redirect: "follow"
};

async function fetchData() {
  const email = document.getElementById("correo").value;
  const pass = document.getElementById("password").value;

  if (!email || !pass) {
    alert("Completa email y contraseña");
    return;
  }

  const url = `https://puclaro.ucn.cl/eross/avance/login.php?email=${encodeURIComponent(email)}&password=${encodeURIComponent(pass)}`;

  try {
    const res = await fetch(url, requestOptions);

    let data;
    try {
      data = await res.json();
    } catch (parseErr) {
      console.error("Error parseando JSON: ", parseErr);
      alert("Respuesta inesperada del servidor");
      return;
    }

    if (!res.ok) {
      const msg = data?.message || data?.error || `Error ${res.status}`;
      alert("Error: " + msg);
      return;
    }

    if (data.error) {
      alert("Error: " + data.error);
      return;
    }

    // Guardar la info del usuario
    localStorage.setItem("user", JSON.stringify(data));

    // Redirigir a otra página
    window.location.href = 'frontend/src/pages/personal.html';

  } catch (err) {
    alert("Credenciales incorrectas o error de conexión");
    console.error(err);
  }
}

loginButton.addEventListener('click', fetchData);
