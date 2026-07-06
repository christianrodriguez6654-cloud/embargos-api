const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { procesarFila } = require("../src/services/normalization.service");
const { guardarFilasProcesadas, pool } = require("../src/repositories/cierres.repository");

const CARPETA_PDFS = path.join(__dirname, "../data/pdfs");
const RUTA_PYTHON = path.join(__dirname, "../extractor/venv/Scripts/python.exe");
const RUTA_EXTRACTOR = path.join(__dirname, "../extractor/extractor.py");

function extraerPdf(rutaPdf) {
  const salida = execFileSync(RUTA_PYTHON, [RUTA_EXTRACTOR, rutaPdf]);
  return JSON.parse(salida.toString("utf-8"));
}

async function main() {

  const archivos = fs
    .readdirSync(CARPETA_PDFS)
    .filter((f) => f.toLowerCase().endsWith(".pdf"));

  console.log(`Se encontraron ${archivos.length} archivos PDF para procesar.\n`);

  const totalResumen = {
    insertadas_validas: 0,
    ya_existian_validas: 0,
    insertadas_rechazos: 0,
    ya_existian_rechazos: 0,
  };

  for (const nombreArchivo of archivos) {
    console.log(`Procesando ${nombreArchivo}...`);
    const rutaCompleta = path.join(CARPETA_PDFS, nombreArchivo);

    const dataExtraida = extraerPdf(rutaCompleta);

    const filasProcesadas = dataExtraida.filas.map((filaCruda) =>
      procesarFila(filaCruda, dataExtraida.archivo),
    );

    const resumenArchivo = await guardarFilasProcesadas(filasProcesadas);
    console.log(`  ${nombreArchivo}:`, resumenArchivo);

    totalResumen.insertadas_validas += resumenArchivo.insertadas_validas;
    totalResumen.ya_existian_validas += resumenArchivo.ya_existian_validas;
    totalResumen.insertadas_rechazos += resumenArchivo.insertadas_rechazos;
    totalResumen.ya_existian_rechazos += resumenArchivo.ya_existian_rechazos;
  }

  console.log("\n✅ Ingesta completa:", totalResumen);
  await pool.end();
}

main().catch((error) => {
  console.error("❌ Error durante la ingesta:", error);
  process.exit(1);
});