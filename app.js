const STORAGE_KEY = 'oposiciones_stats_v1';

let temas = [];
let temaActual = null;

/* ---------------------------------------------------------
   Utilidades de estadísticas (localStorage)
--------------------------------------------------------- */
function cargarStats() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function guardarStats(stats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function registrarIntento(temaId, aciertos, total) {
  const stats = cargarStats();
  const pct = total === 0 ? 0 : Math.round((aciertos / total) * 100);
  const actual = stats[temaId] || { intentos: 0, mejor_pct: 0, ultimo_pct: 0, historial: [] };

  actual.intentos += 1;
  actual.ultimo_pct = pct;
  actual.mejor_pct = Math.max(actual.mejor_pct, pct);
  actual.historial.push({ fecha: new Date().toISOString(), pct });
  if (actual.historial.length > 10) actual.historial.shift();

  stats[temaId] = actual;
  guardarStats(stats);
  return actual;
}

function statsDeTema(temaId) {
  const stats = cargarStats();
  return stats[temaId] || null;
}

/* ---------------------------------------------------------
   Carga inicial
--------------------------------------------------------- */
fetch('temas.json')
  .then(r => r.json())
  .then(datos => {
    temas = datos;
    cargarCheckboxes();
  });

function cargarCheckboxes() {
  const contenedor = document.getElementById('lista-temas');
  contenedor.innerHTML = '';

  temas.forEach(tema => {
    const fila = document.createElement('label');
    fila.className = 'topic-row';

    const stats = statsDeTema(tema.id);
    let scoreHtml = '<span class="topic-score">sin practicar</span>';
    if (stats) {
      const cls = stats.mejor_pct >= 70 ? '' : 'low';
      scoreHtml = `<span class="topic-score ${cls}">mejor: ${stats.mejor_pct}%</span>`;
    }

    fila.innerHTML = `
      <input type="checkbox" value="${tema.id}" checked>
      <span class="topic-label"><span class="topic-num">Tema ${tema.id}.</span> ${tema.titulo}</span>
      ${scoreHtml}
    `;
    contenedor.appendChild(fila);
  });
}

document.getElementById('btn-todos').addEventListener('click', () => {
  document.querySelectorAll('#lista-temas input[type="checkbox"]').forEach(cb => cb.checked = true);
});
document.getElementById('btn-ninguno').addEventListener('click', () => {
  document.querySelectorAll('#lista-temas input[type="checkbox"]').forEach(cb => cb.checked = false);
});

/* ---------------------------------------------------------
   Sortear tema
--------------------------------------------------------- */
document.getElementById('btn-sortear').addEventListener('click', () => {
  const checkboxes = document.querySelectorAll('#lista-temas input[type="checkbox"]:checked');
  const idsSeleccionados = Array.from(checkboxes).map(cb => parseInt(cb.value));

  if (idsSeleccionados.length === 0) {
    alert('Selecciona al menos un tema para el sorteo.');
    return;
  }

  const temasFiltrados = temas.filter(t => idsSeleccionados.includes(t.id));
  temaActual = temasFiltrados[Math.floor(Math.random() * temasFiltrados.length)];

  mostrarZonaEstudio(temaActual);
  document.getElementById('panel-stats').classList.add('hidden');
});

function mostrarZonaEstudio(tema) {
  document.getElementById('tema-numero').textContent = `Nº ${tema.id} — Reconstruye el índice`;
  document.getElementById('tema-titulo').textContent = tema.titulo;

  const stats = statsDeTema(tema.id);
  const meta = document.getElementById('tema-meta');
  meta.textContent = stats
    ? `${stats.intentos} intento(s) · mejor marca: ${stats.mejor_pct}% · última: ${stats.ultimo_pct}%`
    : 'primer intento con este tema';

  const contenedor = document.getElementById('renglones');
  contenedor.innerHTML = '';

  tema.indice.forEach((punto, i) => {
    const nivel = (punto.num.match(/\./g) || []).length; // 0 = epígrafe principal
    const fila = document.createElement('div');
    fila.className = 'renglon';
    fila.style.marginLeft = `${nivel * 22}px`;
    fila.innerHTML = `
      <span class="renglon-num mono">${punto.num}.</span>
      <div class="input-wrap">
        <div class="input-highlight mono" data-idx="${i}" aria-hidden="true"></div>
        <input type="text" class="input-punto" data-idx="${i}" autocomplete="off" placeholder="Punto ${punto.num}...">
      </div>
      <span class="stamp-mark" data-idx="${i}"></span>
    `;
    contenedor.appendChild(fila);
  });

  // Resaltado en vivo: colorea las letras acertadas mientras escribes
  contenedor.querySelectorAll('.input-punto').forEach((input, idx) => {
    const puntoReal = tema.indice[idx].texto;
    const highlight = contenedor.querySelector(`.input-highlight[data-idx="${idx}"]`);
    input.addEventListener('input', () => {
      highlight.innerHTML = resaltarEnVivo(input.value, puntoReal);
    });
  });

  // Enter avanza al siguiente renglón
  contenedor.querySelectorAll('.input-punto').forEach((input, idx, all) => {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        (all[idx + 1] || document.getElementById('btn-validar')).focus();
      }
    });
  });

  document.getElementById('resumen').innerHTML = '';
  document.getElementById('zona-estudio').classList.remove('hidden');

  const primerInput = contenedor.querySelector('.input-punto');
  if (primerInput) primerInput.focus();
}

/* ---------------------------------------------------------
   Comparación de texto
--------------------------------------------------------- */
function simplificar(texto) {
  return texto.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Normaliza un único carácter para comparar ignorando tildes y mayúsculas
function normalizarChar(ch) {
  return ch.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Genera el HTML coloreado que se superpone sobre el input mientras escribes.
// Compara carácter a carácter (por posición) contra el texto real.
function resaltarEnVivo(valorUsuario, textoReal) {
  let html = '';
  for (let i = 0; i < valorUsuario.length; i++) {
    const ch = valorUsuario[i];
    const ok = i < textoReal.length && normalizarChar(ch) === normalizarChar(textoReal[i]);
    html += `<span class="${ok ? 'letra-ok' : 'letra-bad'}">${escapeHtml(ch)}</span>`;
  }
  return html;
}

// Para las estadísticas agregadas: cuántas letras (sobre el texto simplificado) coinciden
function contarLetrasAcertadas(usuario, real) {
  const a = simplificar(usuario);
  const b = simplificar(real);
  let correctas = 0;
  for (let i = 0; i < a.length && i < b.length; i++) {
    if (a[i] === b[i]) correctas++;
  }
  return { correctas, total: b.length };
}

/* ---------------------------------------------------------
   Validar
--------------------------------------------------------- */
document.getElementById('btn-validar').addEventListener('click', () => {
  if (!temaActual) return;

  const indiceReal = temaActual.indice;
  let aciertos = 0;
  let letrasCorrectas = 0;
  let letrasTotal = 0;

  indiceReal.forEach((punto, i) => {
    const puntoReal = punto.texto;
    const fila = document.querySelector(`.input-punto[data-idx="${i}"]`).closest('.renglon');
    const input = fila.querySelector('.input-punto');
    const marca = fila.querySelector('.stamp-mark');
    const valorUsuario = input.value;

    const esCorrecto = simplificar(valorUsuario) === simplificar(puntoReal);

    // Quitar la fila de "mostrar solución" de un intento anterior, si la había
    const siguiente = fila.nextElementSibling;
    if (siguiente && siguiente.classList.contains('solucion-row')) {
      siguiente.remove();
    }

    const letras = contarLetrasAcertadas(valorUsuario, puntoReal);
    letrasCorrectas += letras.correctas;
    letrasTotal += letras.total;

    if (esCorrecto) {
      aciertos++;
      marca.textContent = '✓';
      marca.className = 'stamp-mark ok';
    } else {
      marca.textContent = '✗';
      marca.className = 'stamp-mark bad';

      const solRow = document.createElement('div');
      solRow.className = 'solucion-row';

      const btnSol = document.createElement('button');
      btnSol.type = 'button';
      btnSol.className = 'link-btn btn-solucion';
      btnSol.textContent = 'mostrar solución';

      const notaSol = document.createElement('div');
      notaSol.className = 'correccion hidden';
      notaSol.textContent = `${punto.num}. ${puntoReal}`;

      btnSol.addEventListener('click', () => {
        const oculto = notaSol.classList.toggle('hidden');
        btnSol.textContent = oculto ? 'mostrar solución' : 'ocultar solución';
      });

      solRow.appendChild(btnSol);
      solRow.appendChild(notaSol);
      fila.insertAdjacentElement('afterend', solRow);
    }
  });

  const total = indiceReal.length;
  const pct = total === 0 ? 0 : Math.round((aciertos / total) * 100);
  const pctLetras = letrasTotal === 0 ? 0 : Math.round((letrasCorrectas / letrasTotal) * 100);
  const stats = registrarIntento(temaActual.id, aciertos, total);

  const resumen = document.getElementById('resumen');
  resumen.innerHTML = `
    <div class="puntuacion ${pct >= 70 ? 'ok' : 'bad'}">${aciertos} / ${total} epígrafes exactos · ${pct}%</div>
    <p>Letras acertadas: ${letrasCorrectas} / ${letrasTotal} (${pctLetras}%).</p>
    <p>Mejor marca en este tema: ${stats.mejor_pct}% (${stats.intentos} intento${stats.intentos === 1 ? '' : 's'} en total).</p>
  `;

  cargarCheckboxes(); // refresca los "mejor: X%" de la lista
});

/* ---------------------------------------------------------
   Panel de estadísticas
--------------------------------------------------------- */
document.getElementById('btn-stats').addEventListener('click', () => {
  renderStats();
  document.getElementById('panel-stats').classList.remove('hidden');
  document.getElementById('zona-estudio').classList.add('hidden');
});

function renderStats() {
  const stats = cargarStats();
  const temasConDatos = temas
    .map(t => ({ tema: t, s: stats[t.id] }))
    .filter(x => x.s);

  const globalEl = document.getElementById('stats-global');
  const tablaEl = document.getElementById('stats-tabla');

  if (temasConDatos.length === 0) {
    globalEl.innerHTML = '';
    tablaEl.innerHTML = '<p style="padding-left:46px; color:#5c574c;">Todavía no has validado ningún índice.</p>';
    return;
  }

  const totalIntentos = temasConDatos.reduce((a, x) => a + x.s.intentos, 0);
  const mediaMejor = Math.round(
    temasConDatos.reduce((a, x) => a + x.s.mejor_pct, 0) / temasConDatos.length
  );

  globalEl.innerHTML = `
    <div><span class="num">${temasConDatos.length}</span><span class="lbl">temas practicados</span></div>
    <div><span class="num">${totalIntentos}</span><span class="lbl">intentos totales</span></div>
    <div><span class="num">${mediaMejor}%</span><span class="lbl">media de mejores marcas</span></div>
  `;

  const filas = temasConDatos
    .sort((a, b) => a.s.mejor_pct - b.s.mejor_pct)
    .map(({ tema, s }) => {
      const cls = s.mejor_pct >= 70 ? '' : 'low';
      return `
        <tr>
          <td>Tema ${tema.id}. ${tema.titulo}</td>
          <td>${s.intentos}</td>
          <td>
            <div class="bar-track"><div class="bar-fill ${cls}" style="width:${s.mejor_pct}%"></div></div>
          </td>
          <td>${s.mejor_pct}%</td>
        </tr>
      `;
    })
    .join('');

  tablaEl.innerHTML = `
    <table class="stats-table">
      <thead>
        <tr><th>Tema</th><th>Intentos</th><th>Mejor</th><th></th></tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
  `;
}

document.getElementById('btn-reset-stats').addEventListener('click', () => {
  if (confirm('¿Seguro que quieres borrar todo tu historial de repaso? No se puede deshacer.')) {
    localStorage.removeItem(STORAGE_KEY);
    renderStats();
    cargarCheckboxes();
  }
});
