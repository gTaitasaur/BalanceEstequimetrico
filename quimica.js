// ============================================================
// SECCIÓN 1: PARSEO DE FÓRMULAS Y ECUACIONES
// ============================================================
function parsearFormula(formula) {
    const resultado = {};
    const pila = [resultado]; // Pila para manejar paréntesis
    let i = 0;

    while (i < formula.length) {
        const caracter = formula[i];

        // Si encontramos un paréntesis de apertura
        if (caracter === '(') {
            const nuevoGrupo = {};
            pila.push(nuevoGrupo);
            i++;
        }
        // Si encontramos un paréntesis de cierre
        else if (caracter === ')') {
            i++;
            // Leer el número después del paréntesis
            let multiplicador = '';
            while (i < formula.length && /\d/.test(formula[i])) {
                multiplicador += formula[i];
                i++;
            }
            multiplicador = multiplicador ? parseInt(multiplicador) : 1;

            // Sacar el grupo de la pila y agregarlo al grupo anterior
            const grupo = pila.pop();
            const grupoActual = pila[pila.length - 1];

            for (const elemento in grupo) {
                if (grupoActual[elemento]) {
                    grupoActual[elemento] += grupo[elemento] * multiplicador;
                } else {
                    grupoActual[elemento] = grupo[elemento] * multiplicador;
                }
            }
        }
        // Si es una letra mayúscula (inicio de elemento)
        else if (/[A-Z]/.test(caracter)) {
            let elemento = caracter;
            i++;

            // Leer letras minúsculas que siguen (ej: Ca, Fe, Mg)
            while (i < formula.length && /[a-z]/.test(formula[i])) {
                elemento += formula[i];
                i++;
            }

            // Leer el subíndice (número)
            let subindice = '';
            while (i < formula.length && /\d/.test(formula[i])) {
                subindice += formula[i];
                i++;
            }
            subindice = subindice ? parseInt(subindice) : 1;

            // Agregar al grupo actual
            const grupoActual = pila[pila.length - 1];
            if (grupoActual[elemento]) {
                grupoActual[elemento] += subindice;
            } else {
                grupoActual[elemento] = subindice;
            }
        }
        else {
            i++; // Ignorar caracteres no reconocidos
        }
    }

    return resultado;
}

function parsearCompuesto(compuesto) {
    compuesto = compuesto.trim();

    // Extraer el coeficiente del inicio
    let coeficiente = '';
    let i = 0;

    while (i < compuesto.length && /\d/.test(compuesto[i])) {
        coeficiente += compuesto[i];
        i++;
    }

    coeficiente = coeficiente ? parseInt(coeficiente) : 1;
    const formula = compuesto.slice(i);
    const elementos = parsearFormula(formula);

    return {
        coeficiente: coeficiente,
        formula: formula,
        elementos: elementos
    };
}

function parsearEcuacion(ecuacion) {
    // Normalizar la flecha de reacción
    ecuacion = ecuacion.replace(/→/g, '->').replace(/=/g, '->');

    // Separar en reactivos y productos
    const partes = ecuacion.split('->');

    if (partes.length !== 2) {
        throw new Error('La ecuación debe tener exactamente una flecha de reacción (-> o →)');
    }

    const ladoReactivos = partes[0].trim();
    const ladoProductos = partes[1].trim();

    // Parsear cada lado
    const reactivos = ladoReactivos.split('+').map(r => parsearCompuesto(r));
    const productos = ladoProductos.split('+').map(p => parsearCompuesto(p));

    return {
        reactivos: reactivos,
        productos: productos
    };
}

// ============================================================
// SECCIÓN 2: VALIDACIÓN DE BALANCE
// ============================================================
function contarAtomos(compuestos) {
    const conteo = {};

    for (const compuesto of compuestos) {
        for (const elemento in compuesto.elementos) {
            const cantidad = compuesto.elementos[elemento] * compuesto.coeficiente;
            if (conteo[elemento]) {
                conteo[elemento] += cantidad;
            } else {
                conteo[elemento] = cantidad;
            }
        }
    }

    return conteo;
}

function verificarBalance(ecuacion) {
    const parseada = parsearEcuacion(ecuacion);

    const atomosReactivos = contarAtomos(parseada.reactivos);
    const atomosProductos = contarAtomos(parseada.productos);

    // Obtener todos los elementos presentes
    const elementos = new Set([
        ...Object.keys(atomosReactivos),
        ...Object.keys(atomosProductos)
    ]);

    const detalles = {};
    let balanceada = true;

    for (const elemento of elementos) {
        const enReactivos = atomosReactivos[elemento] || 0;
        const enProductos = atomosProductos[elemento] || 0;

        detalles[elemento] = {
            reactivos: enReactivos,
            productos: enProductos,
            balanceado: enReactivos === enProductos
        };

        if (enReactivos !== enProductos) {
            balanceada = false;
        }
    }

    return {
        balanceada: balanceada,
        detalles: detalles
    };
}

function validarElementos(formula) {
    const elementos = parsearFormula(formula);
    const invalidos = [];

    for (const simbolo in elementos) {
        if (!ELEMENTOS[simbolo]) {
            invalidos.push(simbolo);
        }
    }

    return {
        valida: invalidos.length === 0,
        elementosInvalidos: invalidos
    };
}

function validarEcuacion(ecuacion) {
    try {
        const parseada = parsearEcuacion(ecuacion);

        // Verificar que hay al menos un reactivo y un producto
        if (parseada.reactivos.length === 0) {
            return { valida: false, error: 'La ecuación debe tener al menos un reactivo.' };
        }
        if (parseada.productos.length === 0) {
            return { valida: false, error: 'La ecuación debe tener al menos un producto.' };
        }

        // Verificar que todos los elementos existen
        for (const compuesto of [...parseada.reactivos, ...parseada.productos]) {
            const validacion = validarElementos(compuesto.formula);
            if (!validacion.valida) {
                return {
                    valida: false,
                    error: `Elemento(s) no reconocido(s): ${validacion.elementosInvalidos.join(', ')}`
                };
            }
        }

        return { valida: true, error: null };

    } catch (error) {
        return { valida: false, error: error.message };
    }
}

// ============================================================
// SECCIÓN 3: CÁLCULOS DE MASA MOLAR Y CONVERSIONES
// ============================================================
function calcularMasaMolar(formula) {
    const elementos = parsearFormula(formula);
    let masaTotal = 0;

    for (const simbolo in elementos) {
        if (!ELEMENTOS[simbolo]) {
            throw new Error(`Elemento no reconocido: ${simbolo}`);
        }
        masaTotal += ELEMENTOS[simbolo].masaAtomica * elementos[simbolo];
    }

    return masaTotal;
}

function masaAMoles(masa, formula) {
    const masaMolar = calcularMasaMolar(formula);
    return masa / masaMolar;
}

function molesAMasa(moles, formula) {
    const masaMolar = calcularMasaMolar(formula);
    return moles * masaMolar;
}

// ============================================================
// SECCIÓN 4: CÁLCULOS ESTEQUIOMÉTRICOS
// ============================================================
function encontrarReactivoLimitante(ecuacion, datosReactivos) {
    const parseada = parsearEcuacion(ecuacion);

    // Calcular los moles efectivos (considerando pureza)
    const molesEfectivos = datosReactivos.map(dato => ({
        formula: dato.formula,
        moles: dato.moles * (dato.pureza / 100),
        coeficiente: parseada.reactivos.find(r => r.formula === dato.formula)?.coeficiente || 1
    }));

    // Calcular la proporción moles/coeficiente para cada reactivo
    // El menor valor indica el reactivo limitante
    let limitante = null;
    let menorProporcion = Infinity;

    for (const reactivo of molesEfectivos) {
        const proporcion = reactivo.moles / reactivo.coeficiente;
        if (proporcion < menorProporcion) {
            menorProporcion = proporcion;
            limitante = reactivo;
        }
    }

    return {
        formula: limitante.formula,
        moles: limitante.moles,
        proporcion: menorProporcion
    };
}

function calcularExceso(ecuacion, datosReactivos, limitante) {
    const parseada = parsearEcuacion(ecuacion);
    const excesos = [];

    for (const dato of datosReactivos) {
        if (dato.formula === limitante.formula) continue;

        const reactivo = parseada.reactivos.find(r => r.formula === dato.formula);
        if (!reactivo) continue;

        const molesEfectivos = dato.moles * (dato.pureza / 100);

        // Moles necesarios según estequiometría
        const molesNecesarios = limitante.proporcion * reactivo.coeficiente;

        // Moles sobrantes
        const molesSobrantes = molesEfectivos - molesNecesarios;
        const masaSobrante = molesAMasa(molesSobrantes, dato.formula);

        excesos.push({
            formula: dato.formula,
            molesIniciales: molesEfectivos,
            molesUsados: molesNecesarios,
            molesSobrantes: molesSobrantes,
            masaSobrante: masaSobrante
        });
    }

    return excesos;
}

function calcularRendimientoTeorico(ecuacion, limitante) {
    const parseada = parsearEcuacion(ecuacion);
    const productos = [];

    for (const producto of parseada.productos) {
        // Moles de producto = proporción del limitante × coeficiente del producto
        const moles = limitante.proporcion * producto.coeficiente;
        const masa = molesAMasa(moles, producto.formula);

        productos.push({
            formula: producto.formula,
            coeficiente: producto.coeficiente,
            molesTeoricoS: moles,
            masaTeorica: masa
        });
    }

    return productos;
}

function calcularPorcentajeRendimiento(rendimientoReal, rendimientoTeorico) {
    if (rendimientoTeorico === 0) return 0;
    return (rendimientoReal / rendimientoTeorico) * 100;
}

function calcularEstequiometria(ecuacion, datosReactivos, datosProductoReal = null) {
    // Validar la ecuación
    const validacion = validarEcuacion(ecuacion);
    if (!validacion.valida) {
        throw new Error(validacion.error);
    }

    // Verificar balance
    const balance = verificarBalance(ecuacion);
    if (!balance.balanceada) {
        throw new Error('La ecuación no está balanceada.');
    }

    // Convertir masa a moles si es necesario y aplicar pureza
    const reactivosConMoles = datosReactivos.map(dato => {
        let moles = dato.moles;
        if (dato.masa !== undefined && dato.moles === undefined) {
            moles = masaAMoles(dato.masa, dato.formula);
        }
        return {
            formula: dato.formula,
            masaInicial: dato.masa || molesAMasa(moles, dato.formula),
            moles: moles,
            pureza: dato.pureza || 100
        };
    });

    // Encontrar reactivo limitante
    const limitante = encontrarReactivoLimitante(ecuacion, reactivosConMoles);

    // Calcular exceso
    const excesos = calcularExceso(ecuacion, reactivosConMoles, limitante);

    // Calcular rendimiento teórico
    const productosTeoricos = calcularRendimientoTeorico(ecuacion, limitante);

    // Calcular porcentaje de rendimiento si se proporciona producto real
    let porcentajeRendimiento = null;
    if (datosProductoReal) {
        const productoTeorico = productosTeoricos.find(
            p => p.formula === datosProductoReal.formula
        );

        if (productoTeorico) {
            let masaReal = datosProductoReal.masaReal;
            if (datosProductoReal.molesReales !== undefined) {
                masaReal = molesAMasa(datosProductoReal.molesReales, datosProductoReal.formula);
            }

            porcentajeRendimiento = calcularPorcentajeRendimiento(
                masaReal,
                productoTeorico.masaTeorica
            );
        }
    }

    return {
        ecuacionValida: true,
        balanceada: true,
        reactivoLimitante: {
            formula: limitante.formula,
            masaMolar: calcularMasaMolar(limitante.formula),
            molesUsados: limitante.moles
        },
        reactivosEnExceso: excesos.map(e => ({
            formula: e.formula,
            masaMolar: calcularMasaMolar(e.formula),
            molesIniciales: e.molesIniciales,
            molesUsados: e.molesUsados,
            molesSobrantes: e.molesSobrantes,
            masaSobrante: e.masaSobrante
        })),
        productos: productosTeoricos.map(p => ({
            formula: p.formula,
            masaMolar: calcularMasaMolar(p.formula),
            molesTeoricos: p.molesTeoricoS,
            masaTeorica: p.masaTeorica
        })),
        porcentajeRendimiento: porcentajeRendimiento
    };
}

// ============================================================
// SECCIÓN 5: FUNCIONES DE UTILIDAD
// ============================================================
function formatearNumero(numero, decimales = 4) {
    if (numero === null || numero === undefined || isNaN(numero)) {
        return '-';
    }
    return numero.toFixed(decimales);
}

/**
 * Genera una fórmula química con subíndices en formato HTML.
 * 
 * @param {string} formula - La fórmula química
 * @returns {string} - HTML con subíndices
 */
function formulaAHtml(formula) {
    return formula.replace(/(\d+)/g, '<sub>$1</sub>');
}
