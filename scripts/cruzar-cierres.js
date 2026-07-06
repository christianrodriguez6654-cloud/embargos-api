const { pool } = require("../src/repositories/cierres.repository");

async function cruzarCierres() {
  const query = `
    UPDATE cierres_validos cv
    SET estado_cruce = CASE
      WHEN EXISTS (
        SELECT 1
        FROM embargos_historico eh
        WHERE eh.documento = cv.documento
          AND eh.placa = cv.placa
          AND eh.vigencia = cv.vigencia
      ) THEN 'relacionado'
      ELSE 'no_relacionado'
    END;
  `;

  await pool.query(query);

  const resumen = await pool.query(`
    SELECT estado_cruce, COUNT(*) AS total
    FROM cierres_validos
    GROUP BY estado_cruce
    ORDER BY estado_cruce;
  `);

  return resumen.rows;
}

async function main() {
  console.log("⏳ Ejecutando motor de cruce...");
  const resultado = await cruzarCierres();
  console.log("\n✅ Cruce finalizado:");
  console.table(resultado);
  await pool.end();
}

main();