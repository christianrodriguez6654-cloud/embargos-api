require("dotenv").config();

const express = require("express");
const path = require("path");

const dashboardRoutes = require("./routes/dashboard.routes");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use("/", dashboardRoutes);

app.use((req, res) => {
  res.status(404).send("Página no encontrada.");
});

app.use((err, req, res, next) => {
  console.error("Error no manejado:", err);
  res.status(500).send("Ocurrió un error interno en el servidor.");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});