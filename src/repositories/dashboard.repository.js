const { pool } = require("./cierres.repository");

async function obtenerKpis() {
  try {
    const queries = {
      archivos: `
        SELECT COUNT(*) AS total FROM (
          SELECT archivo FROM cierres_validos
          UNION
          SELECT archivo FROM rechazos
        ) AS todos_los_archivos;
      `,
      validos: "SELECT COUNT(*) AS total FROM cierres_validos;",
      rechazos: "SELECT COUNT(*) AS total FROM rechazos;",
      relacionados: "SELECT COUNT(*) AS total FROM cierres_validos WHERE estado_cruce = 'relacionado';",
      no_relacionados: "SELECT COUNT(*) AS total FROM cierres_validos WHERE estado_cruce = 'no_relacionado';",
      total_historico: "SELECT COUNT(*) AS total FROM embargos_historico;",
      embargos_match: `
        SELECT COUNT(DISTINCT h.id) AS total
        FROM embargos_historico h
        INNER JOIN cierres_validos c
          ON h.documento = c.documento
          AND h.placa = c.placa
          AND h.vigencia = c.vigencia
        WHERE c.estado_cruce = 'relacionado';
      `,
    };

    const [
      resArchivos,
      resValidos,
      resRechazos,
      resRelacionados,
      resNoRelacionados,
      resHistorico,
      resEmbargosMatch,
    ] = await Promise.all([
      pool.query(queries.archivos),
      pool.query(queries.validos),
      pool.query(queries.rechazos),
      pool.query(queries.relacionados),
      pool.query(queries.no_relacionados),
      pool.query(queries.total_historico),
      pool.query(queries.embargos_match),
    ]);

    const archivos_procesados = parseInt(resArchivos.rows[0].total, 10);
    const validos = parseInt(resValidos.rows[0].total, 10);
    const rechazados = parseInt(resRechazos.rows[0].total, 10);
    const relacionados = parseInt(resRelacionados.rows[0].total, 10);
    const no_relacionados = parseInt(resNoRelacionados.rows[0].total, 10);
    const total_embargos = parseInt(resHistorico.rows[0].total, 10);
    const embargos_con_match = parseInt(resEmbargosMatch.rows[0].total, 10);

    const registros_cierre = validos + rechazados;

    const total_cierres_cruzados = relacionados + no_relacionados;
    const porcentaje_match =
      total_cierres_cruzados > 0
        ? parseFloat(((relacionados / total_cierres_cruzados) * 100).toFixed(2))
        : 0.0;

    const embargos_sin_levantamiento = total_embargos - embargos_con_match;

    return {
      archivos_procesados,
      registros_cierre,
      relacionados,
      no_relacionados,
      porcentaje_match,
      rechazados,
      total_embargos,
      embargos_con_match,
      embargos_sin_levantamiento,
    };
  } catch (error) {
    console.error("Error al obtener los KPIs de la base de datos:", error);
    throw error;
  }
}

async function obtenerResumenPorArchivo() {
  const queryValidos = `
    SELECT
      archivo,
      COUNT(*) FILTER (WHERE estado_cruce = 'relacionado') AS relacionados,
      COUNT(*) FILTER (WHERE estado_cruce = 'no_relacionado') AS no_relacionados,
      COUNT(*) AS total_validos
    FROM cierres_validos
    GROUP BY archivo;
  `;

  const queryRechazos = `
    SELECT archivo, COUNT(*) AS total_rechazados
    FROM rechazos
    GROUP BY archivo;
  `;

  const [resValidos, resRechazos] = await Promise.all([
    pool.query(queryValidos),
    pool.query(queryRechazos),
  ]);

  const resumenPorArchivo = new Map();

  for (const fila of resValidos.rows) {
    resumenPorArchivo.set(fila.archivo, {
      archivo: fila.archivo,
      relacionados: parseInt(fila.relacionados, 10),
      no_relacionados: parseInt(fila.no_relacionados, 10),
      total_validos: parseInt(fila.total_validos, 10),
      rechazados: 0,
    });
  }

  for (const fila of resRechazos.rows) {
    const existente = resumenPorArchivo.get(fila.archivo) ?? {
      archivo: fila.archivo,
      relacionados: 0,
      no_relacionados: 0,
      total_validos: 0,
      rechazados: 0,
    };
    existente.rechazados = parseInt(fila.total_rechazados, 10);
    resumenPorArchivo.set(fila.archivo, existente);
  }

  return Array.from(resumenPorArchivo.values())
    .map((item) => {
      const total_cruzados = item.relacionados + item.no_relacionados;
      const porcentaje_match =
        total_cruzados > 0
          ? parseFloat(((item.relacionados / total_cruzados) * 100).toFixed(2))
          : 0.0;

      return {
        archivo: item.archivo,
        registros: item.total_validos + item.rechazados,
        relacionados: item.relacionados,
        no_relacionados: item.no_relacionados,
        rechazados: item.rechazados,
        porcentaje_match,
      };
    })
    .sort((a, b) => a.archivo.localeCompare(b.archivo));
}

async function obtenerDetalleCruce(pagina = 1, porPagina = 20, filtros = {}) {
  const paginaSegura = Math.max(1, pagina);
  const offset = (paginaSegura - 1) * porPagina;

  const condiciones = [];
  const valores = [];

  if (filtros.archivo) {
    valores.push(filtros.archivo);
    condiciones.push(`archivo = $${valores.length}`);
  }

  if (filtros.estado_cruce) {
    valores.push(filtros.estado_cruce);
    condiciones.push(`estado_cruce = $${valores.length}`);
  }

  if (filtros.buscar) {
    valores.push(`%${filtros.buscar}%`);
    const idx = valores.length;
    condiciones.push(
      `(documento ILIKE $${idx} OR placa ILIKE $${idx} OR nombre ILIKE $${idx})`,
    );
  }

  if (filtros.fecha_desde) {
    valores.push(filtros.fecha_desde);
    condiciones.push(`TO_DATE(fecha_embargo, 'DD/MM/YYYY') >= $${valores.length}`);
  }

  if (filtros.fecha_hasta) {
    valores.push(filtros.fecha_hasta);
    condiciones.push(`TO_DATE(fecha_embargo, 'DD/MM/YYYY') <= $${valores.length}`);
  }

  const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

  const queryFilas = `
    SELECT documento, expediente, placa, vigencia, nombre, estado_cruce, archivo, fecha_embargo, fecha_levantamiento
    FROM cierres_validos
    ${whereClause}
    ORDER BY id
    LIMIT $${valores.length + 1} OFFSET $${valores.length + 2};
  `;
  const queryTotal = `SELECT COUNT(*) AS total FROM cierres_validos ${whereClause};`;

  const [resFilas, resTotal] = await Promise.all([
    pool.query(queryFilas, [...valores, porPagina, offset]),
    pool.query(queryTotal, valores),
  ]);

  const totalRegistros = parseInt(resTotal.rows[0].total, 10);
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / porPagina));

  return {
    filas: resFilas.rows,
    paginaActual: paginaSegura,
    totalPaginas,
    totalRegistros,
  };
}

async function obtenerListaArchivos() {
  const query = `
    SELECT archivo FROM (
      SELECT archivo FROM cierres_validos
      UNION
      SELECT archivo FROM rechazos
    ) AS todos_los_archivos
    ORDER BY archivo;
  `;
  const resultado = await pool.query(query);
  return resultado.rows.map((fila) => fila.archivo);
}

async function obtenerNoRelacionadosPorVigencia() {
  const query = `
    SELECT vigencia, COUNT(*) AS total
    FROM cierres_validos
    WHERE estado_cruce = 'no_relacionado'
    GROUP BY vigencia
    ORDER BY vigencia;
  `;
  const resultado = await pool.query(query);
  return resultado.rows.map((fila) => ({
    vigencia: fila.vigencia,
    total: parseInt(fila.total, 10),
  }));
}

module.exports = {
  obtenerKpis,
  obtenerResumenPorArchivo,
  obtenerDetalleCruce,
  obtenerListaArchivos,
  obtenerNoRelacionadosPorVigencia,
};