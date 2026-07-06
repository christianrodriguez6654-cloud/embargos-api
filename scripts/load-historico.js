const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");
const { pool } = require("../src/repositories/cierres.repository");

async function cargarHistorico(rutaCsv) {
  try {
    console.log(`⏳ Leyendo archivo CSV desde: ${rutaCsv}`);
    const contenido = fs.readFileSync(rutaCsv, "utf-8");

    const registros = parse(contenido, {
      columns: true,
      trim: true,
      skip_empty_lines: true
    });

    let insertados = 0;
    let yaExistian = 0;

    console.log(`📊 Procesando ${registros.length} registros...`);

    const query = `
      INSERT INTO embargos_historico (
        documento,
        nombre_completo,
        expediente,
        placa,
        vigencia,
        sade,
        valor_embargo,
        fecha_generacion_mp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (expediente) DO NOTHING;
    `;

    for (const registro of registros) {
      const documento = registro["Numero de Documento"] || registro["Número de Documento"] || null;
      const nombre = registro["Nombre Completo"] || null;
      const expediente = registro["Numero de Expediente"] || registro["Número de Expediente"] || registro["Expediente"] || null;
      const placa = registro["Placa"] || null;
      const vigencia = registro["Vigencia"] || registro["Año"] || null;
      const sade = registro["SADE"] || registro["Sade"] || null;
      const valorEmbargo = registro["Valor Embargo"] || registro["Valor"] || null;
      const fechaGeneracionMp = registro["Fecha Generacion MP"] || registro["Fecha Generación MP"] || registro["Fecha"] || null;

      if (!expediente) {
        continue;
      }

      const valores = [
        documento,
        nombre,
        expediente,
        placa,
        vigencia,
        sade,
        valorEmbargo,
        fechaGeneracionMp
      ];

      const res = await pool.query(query, valores);

      if (res.rowCount && res.rowCount > 0) {
        insertados++;
      } else {
        yaExistian++;
      }
    }

    console.log("\n✅ Carga histórica finalizada con éxito:");
    console.log({ total: registros.length, insertados, yaExistian });

  } catch (error) {
    console.error("❌ Error durante la carga del histórico:", error);
  } finally {
    await pool.end();
  }
}

const rutaCsv = process.argv[2] || path.join(__dirname, "../data/embargos_muestra.csv");
cargarHistorico(rutaCsv);