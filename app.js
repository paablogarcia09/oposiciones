let temas = [];
let temaActual = null;

// Cargar el JSON
fetch('temas.json')
  .then(respuesta => respuesta.json())
  .then(datos => {
    temas = datos;
    cargarCheckboxes();
  });

function cargarCheckboxes() {
  const contenedor = document.getElementById('lista-temas');
  temas.forEach(tema => {
    const etiqueta = document.createElement('label');
    etiqueta.style.display = 'block';
    etiqueta.style.marginBottom = '5px';
    etiqueta.style.cursor = 'pointer';
    etiqueta.innerHTML = `<input type="checkbox" value="${tema.id}" checked> Tema ${tema.id}: ${tema.titulo}`;
    contenedor.appendChild(etiqueta);
  });
}

// Sortear y crear las cajitas dinámicas
document.getElementById('btn-sortear').addEventListener('click', () => {
  const checkboxes = document.querySelectorAll('#lista-temas input[type="checkbox"]:checked');
  const idsSeleccionados = Array.from(checkboxes).map(cb => parseInt(cb.value));
  
  if (idsSeleccionados.length === 0) return alert("¡Selecciona al menos un tema!");
  
  const temasFiltrados = temas.filter(t => idsSeleccionados.includes(t.id));
  temaActual = temasFiltrados[Math.floor(Math.random() * temasFiltrados.length)];
  
  document.getElementById('tema-elegido').innerText = `Tema ${temaActual.id}: ${temaActual.titulo}`;
  document.getElementById('zona-estudio').classList.remove('hidden');
  document.getElementById('resultado').innerHTML = '';
  
  // Limpiar y crear el nuevo esqueleto del índice
  const contenedorInputs = document.getElementById('contenedor-inputs');
  contenedorInputs.innerHTML = '';
  
  temaActual.indice.forEach((punto) => {
    // Expresión regular para separar el número (ej: "2.1.") del texto ("Introducción")
    const coincidencia = punto.match(/^([\d\.]+[-)]?)\s*(.*)/);
    const numeracion = coincidencia ? coincidencia[1] : "•"; 
    const textoReal = coincidencia ? coincidencia[2] : punto;

    const divFila = document.createElement('div');
    divFila.className = 'fila-indice';
    divFila.innerHTML = `
      <span class="numeracion">${numeracion}</span>
      <input type="text" class="input-punto" data-respuesta="${textoReal}" placeholder="...">
    `;
    contenedorInputs.appendChild(divFila);
  });
});

// Validar cada cajita
document.getElementById('btn-validar').addEventListener('click', () => {
  let htmlResultado = '<h3>Resultado de tu corrección:</h3>';
  const filas = document.querySelectorAll('.fila-indice');
  
  const simplificar = (texto) => texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();

  filas.forEach((fila) => {
    const input = fila.querySelector('.input-punto');
    const numeracion = fila.querySelector('.numeracion').innerText;
    const textoUsuario = input.value;
    const textoReal = input.getAttribute('data-respuesta'); // Lo que deberías haber escrito
    
    if (simplificar(textoUsuario) === simplificar(textoReal)) {
      htmlResultado += `<div class="correct">✅ <strong>¡Perfecto!</strong> ${numeracion} ${textoReal}</div>`;
    } else {
      htmlResultado += `<div class="incorrect">❌ <strong>Error.</strong><br>
                        Era: <em>${numeracion} ${textoReal}</em><br>
                        Tú escribiste: <em>${numeracion} ${textoUsuario || '(Lo dejaste en blanco)'}</em></div>`;
    }
  });
  
  document.getElementById('resultado').innerHTML = htmlResultado;
});
