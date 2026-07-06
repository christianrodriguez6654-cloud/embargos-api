function normalizarDocumento(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return "";
  }
  return String(valor).replace(/[^0-9]/g, "");
}

function normalizarPlaca(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return "";
  }
  return String(valor).toUpperCase().replace(/[\s-]/g, "");
}

function normalizarVigencia(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return "";
  }
  const texto = String(valor).trim();
  if (/^\d{4}$/.test(texto)) {
    return texto;
  }

  return texto;
}

function normalizarExpediente(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return "";
  }
  return String(valor).trim();
}

function validarFila(filaNormalizada) {
  const camposObligatorios = ["documento", "expediente", "placa", "vigencia"];
  const motivos = [];

  if (!filaNormalizada || typeof filaNormalizada !== "object") {
    return {
      valido: false,
      motivos: ["La fila proporcionada es inválida o nula."],
    };
  }

  for (const campo of camposObligatorios) {
    const valor = filaNormalizada[campo];

    if (valor === null || valor === undefined || String(valor).trim() === "") {
      motivos.push(`El campo '${campo}' es obligatorio y está vacío.`);
      continue;
    }

    if (campo === "vigencia" && !/^\d{4}$/.test(valor)) {
      motivos.push(
        `El campo 'vigencia' debe tener 4 dígitos (valor recibido: '${valor}').`,
      );
    }
  }
  return {
    valido: motivos.length === 0,
    motivos,
  };
}

function procesarFila(filaCruda, nombreArchivo) {
  if (!filaCruda || typeof filaCruda !== "object") {
    throw new Error(
      `procesarFila recibió una filaCruda inválida: ${JSON.stringify(filaCruda)}`,
    );
  }
  
  const filaNormalizada = {
    documento: normalizarDocumento(filaCruda.documento),
    expediente: normalizarExpediente(filaCruda.expediente),
    placa: normalizarPlaca(filaCruda.placa),
    vigencia: normalizarVigencia(filaCruda.vigencia),

    nombre: filaCruda.nombre ?? null,
    valor_embargo: filaCruda.valor_embargo ?? null,
    fecha_embargo: filaCruda.fecha_embargo ?? null,
    fecha_levantamiento: filaCruda.fecha_levantamiento ?? null,
    sade_banco: filaCruda.sade_banco ?? null,
 
    archivo: nombreArchivo ?? null,
    numero_fila: filaCruda.numero_fila ?? null,
    pagina: filaCruda.pagina ?? null,
  };

  const resultadoValidacion = validarFila(filaNormalizada);
  
  return {
    ...filaNormalizada,
    ...resultadoValidacion
  };
}

module.exports = {
  normalizarDocumento,
  normalizarPlaca,
  normalizarVigencia,
  normalizarExpediente,
  validarFila,
  procesarFila,
};
