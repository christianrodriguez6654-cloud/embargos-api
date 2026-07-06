# Ingesta, Cruce y Dashboard de Cierres de Embargos

Solución local que extrae datos de reportes PDF de cierres de embargos (levantamientos), los normaliza y persiste en PostgreSQL, los cruza contra un histórico de embargos en CSV, y presenta los resultados en un dashboard web.

## Tabla de contenidos

- [Arquitectura general](#arquitectura-general)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Requisitos previos](#requisitos-previos)
- [Instalación](#instalación)
- [Creación de la base de datos](#creación-de-la-base-de-datos)
- [Ejecución del pipeline completo](#ejecución-del-pipeline-completo)
- [Ejecución del dashboard](#ejecución-del-dashboard)

## Arquitectura general

```
┌──────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  PDFs de cierres │ ──▶ |extractor.py     │ ──▶ │ normalization      │
│  (data/pdfs)     │     │ (Python/         │     │ .service.js        │
│                  │     │  pdfplumber)     │     │ (Node)             │
└──────────────────┘     └──────────────────┘     └──────────┬─────────┘
                                                             |
┌─────────────────┐     ┌───────────────────┐                ▼
│ embargos_muestra│ ──▶ │ load-historico.js│ ──▶ ┌────────────────────┐
│ .csv            │     │ (Node)            │     │    PostgreSQL      │
└─────────────────┘     └───────────────────┘     │  cierres_validos   │
                                                  │  rechazos          │
                                                  │  embargos_historico│
                                                  └──────────┬─────────┘
                                                             │
                                                             ▼
                                                  ┌────────────────────┐
                                                  │ cruzar-cierres.js  │
                                                  │ (motor de cruce)   │
                                                  └──────────┬─────────┘
                                                             │
                                                             ▼
                                                  ┌────────────────────┐
                                                  │  Dashboard web     │
                                                  │  (Express + EJS)   │
                                                  └────────────────────┘
```

| Etapa | Script |
|---|---|
| Extracción de tablas de PDF | `extractor/extractor.py` |
| Normalización y validación | `src/services/normalization.service.js` |
| Ingesta de cierres (idempotente) | `scripts/ingestar-cierres.js` |
| Carga del histórico (idempotente) | `scripts/load-historico.js` |
| Motor de cruce | `scripts/cruzar-cierres.js` |
| Dashboard | `src/app.js` |

## Estructura del proyecto

```
embargos-api/
├── data/
│   ├── pdfs/
│   └── embargos_muestra.csv
├── extractor/
│   ├── venv/
│   ├── extractor.py
│   └── requirements.txt
├── migrations/
│   ├── 001_init.sql
│   └── 002_historico.sql
├── scripts/
│   ├── ingestar-cierres.js
│   ├── load-historico.js
│   └── cruzar-cierres.js
├── src/
│   ├── app.js
│   ├── controllers/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   └── views/
├── .env.example
├── package.json
└── README.md
```

## Requisitos previos

- **Node.js** 18 o superior
- **Python** 3.10 o superior
- **PostgreSQL** 14 o superior, corriendo localmente

## Instalación

### 1. Dependencias de Node

```bash
npm install
```

### 2. Entorno de Python para el extractor

```bash
cd extractor
python -m venv venv
```

Windows:
```powershell
venv\Scripts\activate
```
Mac/Linux:
```bash
source venv/bin/activate
```

```bash
pip install pdfplumber
pip freeze > requirements.txt
cd ..
```

### 3. Variables de entorno

Copia `.env.example` a `.env`:

```bash
cp .env.example .env
```

Contenido de referencia (`.env.example`):

```
DB_HOST=tu_puerto || localhost
DB_PORT=tu_puerto || 5432
DB_NAME=embargos_db
DB_USER=tu_usuario
DB_PASSWORD=tu_password
PORT=3000
```

## Creación de la base de datos

```bash
createdb embargos_db
psql -U postgres -d embargos_db -f migrations/001_init.sql
psql -U postgres -d embargos_db -f migrations/002_historico.sql
```

Esto crea las tablas `cierres_validos`, `rechazos` y `embargos_historico`.

## Ejecución del pipeline completo

Correr en este orden:

```bash
# 1. Extrae los 6 PDFs, normaliza y guarda cierres válidos/rechazados
node scripts/ingestar-cierres.js

# 2. Carga el histórico de embargos desde el CSV
node scripts/load-historico.js

# 3. Ejecuta el motor de cruce
node scripts/cruzar-cierres.js
```

Los 3 scripts son idempotentes: correrlos varias veces no duplica registros.

## Resultados obtenidos con el dataset de prueba
 
| Métrica | Valor |
|---|---|
| Archivos PDF procesados | 6 |
| Filas totales extraídas | 246 |
| Cierres válidos | 240 |
| Cierres rechazados | 6 |
| Embargos en histórico | 1.200 |
| Cierres relacionados | 150 |
| Cierres no relacionados | 90 |
| % Match | 62.5% |
| Embargos con match | 150 |
| Embargos sin levantamiento | 1.050 |
 
Segunda ejecución del pipeline completo sobre el mismo dataset: mismos resultados, cero registros duplicados.

## Ejecución del dashboard

```bash
node src/app.js
```

Abre `http://localhost:3000` (o el puerto configurado en tu `.env`).