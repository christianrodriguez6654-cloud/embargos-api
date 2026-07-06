const express = require("express");
const router = express.Router();
const { mostrarDashboard } = require("../controllers/dashboard.controller");

router.get("/", mostrarDashboard);

module.exports = router;
