let temas = [];
let temaActual = null;

// 1. Cargar el archivo JSON al abrir la página
fetch('temas.json')
  .then(respuesta => respuesta.json())
  .then(datos => {
    temas = datos;
    cargarCheckboxes();
  });

// 2. Mostrar la lista de temas con casillas (checkboxes)
function cargarCheckboxes() {
  const contenedor = document.getElementById('lista-temas');
  temas.forEach(tema => {
    const etiqueta = document.createElement('label');
    etiqueta.style.display = 'block';
    etiqueta.style.marginBottom = '5px';
    etiqueta.style.cursor = 'pointer';
    
    // Por defecto marcamos todos
    etiqueta.innerHTML = `<input type="checkbox" value="${tema.id}" checked> 
                          Tema ${tema.id}: ${tema.titulo}`;
    contenedor.appendChild(etiqueta);
  });
}

// 3. Lógica para sortear un tema
document.getElementById('btn-sortear').addEventListener('click', () => {
  // Ver qué casillas están marcadas
  const checkboxes = document.querySelectorAll('#lista-temas input[type="checkbox"]:checked');
  const idsSeleccionados = Array.from(checkboxes).map(cb => parseInt(cb.value));
  
  if (idsSeleccionados.length === 0) {
    alert("¡Debes seleccionar al menos un tema para el sorteo!");
    return;
  }
  
  // Filtrar y elegir al azar
  const temasFiltrados = temas.filter(t => idsSeleccionados.includes(t.id));
  const indiceAzar = Math.floor(Math.random() * temasFiltrados.length);
  temaActual = temasFiltrados[indiceAzar];
  
  // Mostrar la zona de estudio
  document.getElementById('tema-elegido').innerText = `Tema ${temaActual.id}: ${temaActual.titulo}`;
  document.getElementById('zona-estudio').classList.remove('hidden');
  
  // Limpiar intentos anteriores
  document.getElementById('input-indice').value = '';
  document.getElementById('resultado').innerHTML = '';
});

// 4. Lógica para validar tu respuesta
document.getElementById('btn-validar').addEventListener('click', () => {
  // Separamos lo que has escrito por saltos de línea y quitamos líneas vacías
  const textoUsuario = document.getElementById('input-indice').value;
  const lineasUsuario = textoUsuario.split('\n').map(l => l.trim()).filter(l => l !== '');
  const indiceReal = temaActual.indice;
  
  let htmlResultado = '<h3>Resultado de tu corrección:</h3>';
  
  // Función para normalizar texto (quita tildes, comas, puntos y lo pasa a minúsculas)
  // Así el sistema te da por bueno "1 introduccion" aunque el original sea "1. Introducción"
  const simplificar = (texto) => {
    return texto.toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quita tildes
                .replace(/[^a-z0-9\s]/g, "") // Quita puntos y comas
                .trim();
  };

  indiceReal.forEach((puntoReal, i) => {
    const realSimplificado = simplificar(puntoReal);
    const usuarioOriginal = lineasUsuario[i] || "";
    const usuarioSimplificado = simplificar(usuarioOriginal);
    
    // Si tu línea contiene las mismas palabras clave (aprox) que la real
    if (usuarioSimplificado === realSimplificado) {
      htmlResultado += `<div class="correct">✅ <strong>¡Perfecto!</strong> ${puntoReal}</div>`;
    } else {
      htmlResultado += `<div class="incorrect">❌ <strong>Error en este punto.</strong><br>
                        Era: <em>${puntoReal}</em><br>
                        Tú escribiste: <em>${usuarioOriginal || '(Lo dejaste en blanco)'}</em></div>`;
    }
  });
  
  document.getElementById('resultado').innerHTML = htmlResultado;
});
