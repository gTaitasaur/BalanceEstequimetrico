// ============================================================
// SECCIÓN 1: ELEMENTOS DEL DOM
// ============================================================

// Elementos principales
const formularioEcuacion = document.getElementById('formulario-ecuacion');
const inputEcuacion = document.getElementById('input-ecuacion');
const botonValidar = document.getElementById('boton-validar');
const seccionReactivos = document.getElementById('seccion-reactivos');
const contenedorReactivos = document.getElementById('contenedor-reactivos');
const seccionResultados = document.getElementById('seccion-resultados');
const contenedorResultados = document.getElementById('contenedor-resultados');
const mensajeEstado = document.getElementById('mensaje-estado');

// Estado de la aplicación
let ecuacionActual = null;
let ecuacionParseada = null;

// ============================================================
// SECCIÓN 2: VALIDACIÓN DE LA ECUACIÓN
// ============================================================

/**
 * Muestra un mensaje de estado al usuario.
 * 
 * @param {string} mensaje - El mensaje a mostrar
 * @param {string} tipo - Tipo de mensaje: 'exito', 'error', 'info'
 */
function mostrarMensaje(mensaje, tipo = 'info') {
    mensajeEstado.textContent = mensaje;
    mensajeEstado.className = `mensaje-estado ${tipo}`;
    mensajeEstado.style.display = 'block';

    // Ocultar después de 5 segundos si es éxito o info
    if (tipo !== 'error') {
        setTimeout(() => {
            mensajeEstado.style.display = 'none';
        }, 5000);
    }
}

/**
 * Oculta el mensaje de estado.
 */
function ocultarMensaje() {
    mensajeEstado.style.display = 'none';
}

/**
 * Valida la ecuación ingresada y genera el formulario de reactivos.
 */
function validarEcuacionIngresada() {
    const ecuacion = inputEcuacion.value.trim();

    if (!ecuacion) {
        mostrarMensaje('Por favor, ingresa una ecuación química.', 'error');
        return;
    }

    // Primero validar sintaxis y elementos
    const validacion = validarEcuacion(ecuacion);
    if (!validacion.valida) {
        mostrarMensaje(validacion.error, 'error');
        ocultarSeccionReactivos();
        ocultarSeccionResultados();
        return;
    }

    // Luego verificar el balance
    const balance = verificarBalance(ecuacion);
    if (!balance.balanceada) {
        let mensajeBalance = 'La ecuación NO está balanceada. Por favor, balancéala antes de continuar.\n\nDetalles:\n';

        for (const elemento in balance.detalles) {
            const detalle = balance.detalles[elemento];
            if (!detalle.balanceado) {
                mensajeBalance += `• ${elemento}: ${detalle.reactivos} en reactivos, ${detalle.productos} en productos\n`;
            }
        }

        mostrarMensaje(mensajeBalance, 'error');
        mostrarDetallesBalance(balance.detalles);
        ocultarSeccionReactivos();
        ocultarSeccionResultados();
        return;
    }

    // La ecuación es válida y está balanceada
    ecuacionActual = ecuacion;
    ecuacionParseada = parsearEcuacion(ecuacion);

    mostrarMensaje('¡Ecuación válida y balanceada! Ingresa los datos de los reactivos.', 'exito');
    generarFormularioReactivos();
    mostrarSeccionReactivos();
    ocultarSeccionResultados();
}

/**
 * Muestra los detalles del balance en una tabla visual.
 */
function mostrarDetallesBalance(detalles) {
    let html = `
        <div class="tabla-balance">
            <h4>Análisis del Balance</h4>
            <table>
                <thead>
                    <tr>
                        <th>Elemento</th>
                        <th>En Reactivos</th>
                        <th>En Productos</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
    `;

    for (const elemento in detalles) {
        const d = detalles[elemento];
        const clase = d.balanceado ? 'balanceado' : 'no-balanceado';
        const icono = d.balanceado ? '✓' : '✗';

        html += `
            <tr class="${clase}">
                <td><strong>${elemento}</strong></td>
                <td>${d.reactivos}</td>
                <td>${d.productos}</td>
                <td>${icono}</td>
            </tr>
        `;
    }

    html += '</tbody></table></div>';

    contenedorResultados.innerHTML = html;
    seccionResultados.style.display = 'block';
}

// ============================================================
// SECCIÓN 3: FORMULARIO DE REACTIVOS
// ============================================================

/**
 * Genera el formulario dinámico para ingresar datos de cada reactivo.
 */
function generarFormularioReactivos() {
    contenedorReactivos.innerHTML = '';

    // Crear un campo para cada reactivo
    ecuacionParseada.reactivos.forEach((reactivo, indice) => {
        const masaMolar = calcularMasaMolar(reactivo.formula);
        const formulaHtml = formulaAHtml(reactivo.formula);

        const tarjeta = document.createElement('div');
        tarjeta.className = 'tarjeta-reactivo';
        tarjeta.innerHTML = `
            <div class="encabezado-reactivo">
                <h4>Reactivo ${indice + 1}: <span class="formula">${formulaHtml}</span></h4>
                <span class="masa-molar">Masa molar: ${masaMolar.toFixed(3)} g/mol</span>
            </div>
            
            <div class="campos-reactivo">
                <div class="grupo-campo">
                    <label for="tipo-cantidad-${indice}">Tipo de cantidad:</label>
                    <select id="tipo-cantidad-${indice}" class="tipo-cantidad" data-indice="${indice}">
                        <option value="masa">Masa (gramos)</option>
                        <option value="moles">Moles</option>
                    </select>
                </div>
                
                <div class="grupo-campo">
                    <label for="cantidad-${indice}" id="label-cantidad-${indice}">Masa (g):</label>
                    <input type="number" 
                           id="cantidad-${indice}" 
                           class="cantidad-reactivo"
                           data-formula="${reactivo.formula}"
                           step="any" 
                           min="0" 
                           placeholder="Ej: 10.5"
                           required>
                </div>
                
                <div class="grupo-campo">
                    <label for="pureza-${indice}">Pureza (%):</label>
                    <input type="number" 
                           id="pureza-${indice}" 
                           class="pureza-reactivo"
                           value="100" 
                           step="any" 
                           min="0" 
                           max="100"
                           placeholder="100">
                </div>
            </div>
        `;

        contenedorReactivos.appendChild(tarjeta);

        // Evento para cambiar el label según el tipo seleccionado
        const selectTipo = tarjeta.querySelector(`#tipo-cantidad-${indice}`);
        selectTipo.addEventListener('change', (e) => {
            const label = tarjeta.querySelector(`#label-cantidad-${indice}`);
            label.textContent = e.target.value === 'masa' ? 'Masa (g):' : 'Moles:';
        });
    });

    // Sección de producto real (opcional)
    const seccionProducto = document.createElement('div');
    seccionProducto.className = 'seccion-producto-real';
    seccionProducto.innerHTML = `
        <h4>📊 Rendimiento Real (Opcional)</h4>
        <p class="descripcion-producto">Si conoces la cantidad real de producto obtenida, ingrésala aquí para calcular el porcentaje de rendimiento.</p>
        
        <div class="campos-producto">
            <div class="grupo-campo">
                <label for="select-producto">Producto:</label>
                <select id="select-producto">
                    ${ecuacionParseada.productos.map((p, i) =>
        `<option value="${p.formula}">${formulaAHtml(p.formula)}</option>`
    ).join('')}
                </select>
            </div>
            
            <div class="grupo-campo">
                <label for="tipo-producto">Tipo:</label>
                <select id="tipo-producto">
                    <option value="masa">Masa (g)</option>
                    <option value="moles">Moles</option>
                </select>
            </div>
            
            <div class="grupo-campo">
                <label for="cantidad-producto-real">Cantidad real:</label>
                <input type="number" 
                       id="cantidad-producto-real" 
                       step="any" 
                       min="0" 
                       placeholder="Dejar vacío si no aplica">
            </div>
        </div>
    `;

    contenedorReactivos.appendChild(seccionProducto);

    // Botón de calcular
    const botonCalcular = document.createElement('button');
    botonCalcular.id = 'boton-calcular';
    botonCalcular.className = 'boton-primario';
    botonCalcular.textContent = '🔬 Calcular Estequiometría';
    botonCalcular.addEventListener('click', realizarCalculos);

    contenedorReactivos.appendChild(botonCalcular);
}

/**
 * Muestra la sección de reactivos.
 */
function mostrarSeccionReactivos() {
    seccionReactivos.style.display = 'block';
}

/**
 * Oculta la sección de reactivos.
 */
function ocultarSeccionReactivos() {
    seccionReactivos.style.display = 'none';
}

/**
 * Oculta la sección de resultados.
 */
function ocultarSeccionResultados() {
    seccionResultados.style.display = 'none';
}

// ============================================================
// SECCIÓN 4: CÁLCULOS Y RESULTADOS
// ============================================================

/**
 * Recopila los datos ingresados y realiza los cálculos.
 */
function realizarCalculos() {
    try {
        // Recopilar datos de reactivos
        const datosReactivos = [];

        ecuacionParseada.reactivos.forEach((reactivo, indice) => {
            const tipoCantidad = document.getElementById(`tipo-cantidad-${indice}`).value;
            const cantidad = parseFloat(document.getElementById(`cantidad-${indice}`).value);
            const pureza = parseFloat(document.getElementById(`pureza-${indice}`).value) || 100;

            if (isNaN(cantidad) || cantidad <= 0) {
                throw new Error(`Por favor, ingresa una cantidad válida para ${reactivo.formula}`);
            }

            if (pureza < 0 || pureza > 100) {
                throw new Error(`La pureza debe estar entre 0 y 100% para ${reactivo.formula}`);
            }

            const dato = {
                formula: reactivo.formula,
                pureza: pureza
            };

            if (tipoCantidad === 'masa') {
                dato.masa = cantidad;
            } else {
                dato.moles = cantidad;
            }

            datosReactivos.push(dato);
        });

        // Datos de producto real (opcional)
        let datosProductoReal = null;
        const cantidadProductoReal = document.getElementById('cantidad-producto-real').value;

        if (cantidadProductoReal && parseFloat(cantidadProductoReal) > 0) {
            const formulaProducto = document.getElementById('select-producto').value;
            const tipoProducto = document.getElementById('tipo-producto').value;

            datosProductoReal = {
                formula: formulaProducto
            };

            if (tipoProducto === 'masa') {
                datosProductoReal.masaReal = parseFloat(cantidadProductoReal);
            } else {
                datosProductoReal.molesReales = parseFloat(cantidadProductoReal);
            }
        }

        // Realizar cálculos
        const resultados = calcularEstequiometria(
            ecuacionActual,
            datosReactivos,
            datosProductoReal
        );

        // Mostrar resultados
        mostrarResultados(resultados, datosReactivos);

    } catch (error) {
        mostrarMensaje(error.message, 'error');
    }
}

/**
 * Muestra los resultados de los cálculos en una interfaz visual.
 */
function mostrarResultados(resultados, datosReactivos) {
    seccionResultados.style.display = 'block';

    // Encontrar el reactivo en exceso para el resumen
    const nombreLimitante = ELEMENTOS[Object.keys(parsearFormula(resultados.reactivoLimitante.formula))[0]]?.nombre || resultados.reactivoLimitante.formula;

    let html = `
        <div class="resultados-container">
            <!-- Resumen Principal -->
            <div class="tarjeta-resultado destacada">
                <h3>📌 Resumen de la Reacción</h3>
                <div class="resumen-grid">
                    <div class="resumen-item limitante">
                        <span class="resumen-label">Reactivo Limitante</span>
                        <span class="resumen-valor formula">${formulaAHtml(resultados.reactivoLimitante.formula)}</span>
                    </div>
    `;

    // Mostrar reactivos en exceso
    if (resultados.reactivosEnExceso.length > 0) {
        html += `
                    <div class="resumen-item exceso">
                        <span class="resumen-label">Reactivo(s) en Exceso</span>
                        <span class="resumen-valor">
                            ${resultados.reactivosEnExceso.map(e =>
            `<span class="formula">${formulaAHtml(e.formula)}</span>`
        ).join(', ')}
                        </span>
                    </div>
        `;
    }

    // Mostrar rendimiento si está disponible
    if (resultados.porcentajeRendimiento !== null) {
        const esRendimientoInvalido = resultados.porcentajeRendimiento > 100;
        html += `
                    <div class="resumen-item rendimiento">
                        <span class="resumen-label">Porcentaje de Rendimiento</span>
                        <span class="resumen-valor">${resultados.porcentajeRendimiento.toFixed(2)}%</span>
                        ${esRendimientoInvalido ? `
                        <span class="advertencia-rendimiento">⚠️ El rendimiento no puede ser mayor a 100%. Revisa los datos ingresados.</span>
                        ` : ''}
                    </div>
        `;
    }

    html += `
                </div>
            </div>
            
            <!-- Tabla de Reactivos -->
            <div class="tarjeta-resultado">
                <h3>⚗️ Análisis de Reactivos</h3>
                <div class="tabla-responsive">
                    <table class="tabla-resultados">
                        <thead>
                            <tr>
                                <th>Reactivo</th>
                                <th>Masa Molar (g/mol)</th>
                                <th>Cantidad Inicial</th>
                                <th>Moles Efectivos</th>
                                <th>Rol</th>
                            </tr>
                        </thead>
                        <tbody>
    `;

    // Fila del reactivo limitante
    const datoLimitante = datosReactivos.find(d => d.formula === resultados.reactivoLimitante.formula);
    const masaInicialLimitante = datoLimitante.masa || molesAMasa(datoLimitante.moles, datoLimitante.formula);

    html += `
                            <tr class="fila-limitante">
                                <td class="formula">${formulaAHtml(resultados.reactivoLimitante.formula)}</td>
                                <td>${resultados.reactivoLimitante.masaMolar.toFixed(3)}</td>
                                <td>${masaInicialLimitante.toFixed(4)} g</td>
                                <td>${resultados.reactivoLimitante.molesUsados.toFixed(4)} mol</td>
                                <td><span class="etiqueta limitante">LIMITANTE</span></td>
                            </tr>
    `;

    // Filas de reactivos en exceso
    for (const exceso of resultados.reactivosEnExceso) {
        const datoExceso = datosReactivos.find(d => d.formula === exceso.formula);
        const masaInicialExceso = datoExceso.masa || molesAMasa(datoExceso.moles, datoExceso.formula);

        html += `
                            <tr class="fila-exceso">
                                <td class="formula">${formulaAHtml(exceso.formula)}</td>
                                <td>${exceso.masaMolar.toFixed(3)}</td>
                                <td>${masaInicialExceso.toFixed(4)} g</td>
                                <td>${exceso.molesIniciales.toFixed(4)} mol</td>
                                <td><span class="etiqueta exceso">EN EXCESO</span></td>
                            </tr>
        `;
    }

    html += `
                        </tbody>
                    </table>
                </div>
            </div>
    `;

    // Tabla de reactivos en exceso con detalles
    if (resultados.reactivosEnExceso.length > 0) {
        html += `
            <div class="tarjeta-resultado">
                <h3>📊 Detalle de Reactivos en Exceso</h3>
                <div class="tabla-responsive">
                    <table class="tabla-resultados">
                        <thead>
                            <tr>
                                <th>Reactivo</th>
                                <th>Moles Usados</th>
                                <th>Moles Sobrantes</th>
                                <th>Masa Sobrante</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        for (const exceso of resultados.reactivosEnExceso) {
            html += `
                            <tr>
                                <td class="formula">${formulaAHtml(exceso.formula)}</td>
                                <td>${exceso.molesUsados.toFixed(4)} mol</td>
                                <td>${exceso.molesSobrantes.toFixed(4)} mol</td>
                                <td>${exceso.masaSobrante.toFixed(4)} g</td>
                            </tr>
            `;
        }

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Tabla de productos
    html += `
            <div class="tarjeta-resultado">
                <h3>🧪 Productos (Rendimiento Teórico)</h3>
                <div class="tabla-responsive">
                    <table class="tabla-resultados">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Masa Molar (g/mol)</th>
                                <th>Moles Teóricos</th>
                                <th>Masa Teórica</th>
                            </tr>
                        </thead>
                        <tbody>
    `;

    for (const producto of resultados.productos) {
        html += `
                            <tr>
                                <td class="formula">${formulaAHtml(producto.formula)}</td>
                                <td>${producto.masaMolar.toFixed(3)}</td>
                                <td>${producto.molesTeoricos.toFixed(4)} mol</td>
                                <td>${producto.masaTeorica.toFixed(4)} g</td>
                            </tr>
        `;
    }

    html += `
                        </tbody>
                    </table>
                </div>
            </div>
    `;

    // Información de pureza si aplica
    const reactivosConPurezaMenor100 = datosReactivos.filter(d => d.pureza < 100);
    if (reactivosConPurezaMenor100.length > 0) {
        html += `
            <div class="tarjeta-resultado info-pureza">
                <h3>🔍 Efecto de la Pureza</h3>
                <p>Los siguientes reactivos tienen pureza menor al 100%, lo cual afecta los cálculos:</p>
                <ul>
        `;

        for (const r of reactivosConPurezaMenor100) {
            const masaInicial = r.masa || molesAMasa(r.moles, r.formula);
            const masaEfectiva = masaInicial * (r.pureza / 100);
            html += `
                    <li>
                        <strong class="formula">${formulaAHtml(r.formula)}</strong>: 
                        Pureza ${r.pureza}% → De ${masaInicial.toFixed(4)} g, solo ${masaEfectiva.toFixed(4)} g son reactivo puro.
                    </li>
            `;
        }

        html += `
                </ul>
            </div>
        `;
    }

    html += '</div>';

    contenedorResultados.innerHTML = html;
}

// ============================================================
// SECCIÓN 5: EJEMPLOS Y AYUDA
// ============================================================

/**
 * Carga un ejemplo en el campo de ecuación.
 */
function cargarEjemplo(ecuacion) {
    inputEcuacion.value = ecuacion;
    inputEcuacion.focus();
}

// ============================================================
// SECCIÓN 6: INICIALIZACIÓN
// ============================================================

// Evento principal del botón validar
botonValidar.addEventListener('click', validarEcuacionIngresada);

// También validar al presionar Enter en el input
inputEcuacion.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        validarEcuacionIngresada();
    }
});

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    ocultarSeccionReactivos();
    ocultarSeccionResultados();
    ocultarMensaje();
});
