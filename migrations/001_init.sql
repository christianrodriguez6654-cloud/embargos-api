CREATE TABLE cierres_validos (
    id SERIAL PRIMARY KEY,
    archivo VARCHAR(255) NOT NULL,
    numero_fila INTEGER NOT NULL,
    pagina INTEGER,
    documento VARCHAR(20) NOT NULL,
    expediente VARCHAR(50) NOT NULL,
    placa VARCHAR(10) NOT NULL,
    vigencia VARCHAR(4) NOT NULL,
    nombre VARCHAR(255),
    valor_embargo VARCHAR(50),
    fecha_embargo VARCHAR(20),
    fecha_levantamiento VARCHAR(20),
    sade_banco VARCHAR(50),
    creado_en TIMESTAMP DEFAULT NOW(),
    UNIQUE (archivo, numero_fila)
);

CREATE TABLE rechazos (
    id SERIAL PRIMARY KEY,
    archivo VARCHAR(255) NOT NULL,
    numero_fila INTEGER NOT NULL,
    pagina INTEGER,
    creado_en TIMESTAMP DEFAULT NOW(),
    UNIQUE (archivo, numero_fila)
);