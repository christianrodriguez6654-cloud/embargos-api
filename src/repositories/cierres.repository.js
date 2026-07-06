const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "embargos_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "admin",
});

/**
 * Inserta un cierre válido. Si ya existe una fila con el mismo
 * (archivo, numero_fila) -por una corrida previa de la ingesta-,
 * no hace nada gracias a ON CONFLICT DO NOTHING. Así, correr la
 * ingesta N veces sobre el mismo archivo produce el mismo resultado
 * que correrla una sola vez.
 *
 * @returns {boolean} true si insertó una fila nueva, false si ya existía
 */
async function insertarCierreValido(fila) {
  const query = `
    INSERT INTO cierres_validos (
      archivo, numero_fila, pagina,
      documento, expediente, placa, vigencia,
      nombre, valor_embargo, fecha_embargo, fecha_levantamiento, sade_banco
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (archivo, numero_fila) DO NOTHING
    RETURNING id;
  `;
  const valores = [
    fila.archivo,
    fila.numero_fila,
    fila.pagina,
    fila.documento,
    fila.expediente,
    fila.placa,
    fila.vigencia,
    fila.nombre,
    fila.valor_embargo,
    fila.fecha_embargo,
    fila.fecha_levantamiento,
    fila.sade_banco,
  ];

  const resultado = await pool.query(query, valores);

  return resultado.rows.length > 0;
}

async function insertarRechazo(fila) {
  const query = `
    INSERT INTO rechazos (
      archivo, numero_fila, pagina,
      documento, expediente, placa, vigencia,
      nombre, valor_embargo, fecha_embargo, fecha_levantamiento, sade_banco,
      motivos
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (archivo, numero_fila) DO NOTHING
    RETURNING id;
  `;
  const valores = [
    fila.archivo,
    fila.numero_fila,
    fila.pagina,
    fila.documento || null,
    fila.expediente || null,
    fila.placa || null,
    fila.vigencia || null,
    fila.nombre,
    fila.valor_embargo,
    fila.fecha_embargo,
    fila.fecha_levantamiento,
    fila.sade_banco,
    fila.motivos, 
  ];

  const resultado = await pool.query(query, valores);
  return resultado.rows.length > 0;
}

async function guardarFilasProcesadas(filasProcesadas) {
  const resumen = { insertadas_validas: 0, ya_existian_validas: 0, insertadas_rechazos: 0, ya_existian_rechazos: 0 };

  for (const fila of filasProcesadas) {
    if (fila.valido) {
      const insertada = await insertarCierreValido(fila);
      insertada ? resumen.insertadas_validas++ : resumen.ya_existian_validas++;
    } else {
      const insertada = await insertarRechazo(fila);
      insertada ? resumen.insertadas_rechazos++ : resumen.ya_existian_rechazos++;
    }
  }

  return resumen;
}

module.exports = {
  pool,
  insertarCierreValido,
  insertarRechazo,
  guardarFilasProcesadas,
};