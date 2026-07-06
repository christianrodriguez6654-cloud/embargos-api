const {
  obtenerKpis,
  obtenerResumenPorArchivo,
  obtenerDetalleCruce,
  obtenerListaArchivos,
  obtenerNoRelacionadosPorVigencia,
} = require("../repositories/dashboard.repository");

async function mostrarDashboard(req, res) {
  try {
    const pagina = parseInt(req.query.pagina, 10) || 1;

    const filtros = {
      archivo: req.query.archivo || null,
      estado_cruce: req.query.estado_cruce || null,
      buscar: req.query.buscar || null,
      fecha_desde: req.query.fecha_desde || null,
      fecha_hasta: req.query.fecha_hasta || null,
    };

    const [kpis, resumenPorArchivo, detalle, listaArchivos, noRelacionadosPorVigencia] = await Promise.all([
      obtenerKpis(),
      obtenerResumenPorArchivo(),
      obtenerDetalleCruce(pagina, 20, filtros),
      obtenerListaArchivos(),
      obtenerNoRelacionadosPorVigencia(),
    ]);

    res.render("dashboard", { kpis, resumenPorArchivo, detalle, listaArchivos, filtros, noRelacionadosPorVigencia });
  } catch (error) {
    console.error("Error al renderizar el dashboard:", error);
    res.status(500).send("Ocurrió un error al cargar el dashboard.");
  }
}

module.exports = { mostrarDashboard };